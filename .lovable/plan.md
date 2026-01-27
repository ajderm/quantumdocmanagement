
# Add Company-Associated Contact Mapping Support

## Problem Statement
Currently, the field mapping system only supports:
- Contacts directly associated with the Deal
- Hardcoded labeled contacts from the Company (Shipping, AP, IT)

Users need to map fields to contact properties where the contact is:
- Associated to the **Company** (not the Deal)
- Identified by a custom **association label** (e.g., "Shipping Contact", "Billing Manager", etc.)

## Solution Overview

Introduce an "Association Path" concept to the field mapping system that allows specifying:
1. **Source Object**: Where to find the associated record (e.g., `company`)
2. **Target Object**: What type of record to fetch (e.g., `contact`)
3. **Association Label**: Which labeled association to use (e.g., "Shipping Contact")
4. **Property**: Which property to extract from the target record

## Database Changes

Add a new column to track the association path:

```sql
ALTER TABLE hubspot_field_mappings 
ADD COLUMN association_path text;
```

The `association_path` will store values like:
- `null` or empty = direct property access (current behavior)
- `company_contact` = contact associated with the company

Combined with the existing `association_label`, this enables:
- `hubspot_object: 'contact'`
- `hubspot_property: 'email'`
- `association_path: 'company_contact'`
- `association_label: 'Shipping Contact'`

Meaning: "Get the `email` from the Contact labeled 'Shipping Contact' that is associated with the Company"

## UI Changes

### FieldMappingEditor Updates

When a user selects "Contact" as the object type, show an additional dropdown:

```text
+-------------------+  +--------------------+  +------------------+  +-------------------+
| Object: Contact   |  | Path: Via Company  |  | Property: Email  |  | Label: Shipping   |
+-------------------+  +--------------------+  +------------------+  +-------------------+
```

**Association Path Options:**
- "Direct (Deal Association)" - current behavior
- "Via Company" - contact associated with the company

When "Via Company" is selected, the Association Label dropdown becomes **required** (otherwise we wouldn't know which contact to pick).

## Backend Changes

### hubspot-get-deal Function

Update to dynamically fetch company-associated contacts based on field mappings:

1. **Collect required labels**: Scan all field mappings with `association_path = 'company_contact'` to get unique labels needed

2. **Expand fetchLabeledContacts**: Instead of hardcoded labels, pass the list of labels to fetch

3. **Return contacts by label**: Add a new `companyContacts` object to the response keyed by association label

```typescript
// New response structure
{
  // ...existing fields...
  companyContacts: {
    'Shipping Contact': { firstName, lastName, email, phone, properties: {...} },
    'Billing Manager': { firstName, lastName, email, phone, properties: {...} },
  }
}
```

### CustomDocumentForm Field Resolution

Update `resolveHubSpotField` to handle the association path:

```typescript
const resolveHubSpotField = (mapping: FieldMapping) => {
  const { hubspot_object, hubspot_property, association_path, association_label } = mapping;
  
  if (hubspot_object === 'contact' && association_path === 'company_contact') {
    // Get contact from company's labeled associations
    const contact = companyContacts?.[association_label];
    return contact?.properties?.[hubspot_property] || '';
  }
  
  // ...existing direct property resolution...
};
```

## Implementation Steps

### Step 1: Database Migration
Add the `association_path` column to `hubspot_field_mappings`

### Step 2: Update Field Mapping UI
Modify `FieldMappingEditor.tsx`:
- Add "Association Path" dropdown when Contact is selected
- Make Association Label required when path is "Via Company"
- Update save/load logic to include the new field

### Step 3: Update Backend Edge Functions
Modify `hubspot-get-deal/index.ts`:
- Read association paths from field mappings
- Dynamically determine which company-contact labels to fetch
- Expand labeled contacts response to include all mapped labels

Modify `field-mappings-save/index.ts`:
- Handle the new `association_path` field

### Step 4: Update Field Resolution
Modify `CustomDocumentForm.tsx`:
- Accept new `companyContacts` prop
- Update resolution logic for company-associated contacts

## Files to Modify

| File | Changes |
|------|---------|
| Migration | Add `association_path` column |
| `supabase/functions/field-mappings-save/index.ts` | Include `association_path` in save/load |
| `supabase/functions/hubspot-get-deal/index.ts` | Dynamic label fetching, return `companyContacts` |
| `src/components/admin/types.ts` | Add `association_path` to FieldMapping type |
| `src/components/admin/FieldMappingEditor.tsx` | Add Association Path dropdown UI |
| `src/hooks/useHubSpot.tsx` | Add `companyContacts` to context |
| `src/components/custom-document/CustomDocumentForm.tsx` | Update field resolution |
| `src/pages/DocumentHub.tsx` | Pass `companyContacts` to form |

## Visual Flow

```text
Field Mapping Configuration:
+------------------------------------------------------------------+
| Ship To Contact Email                                             |
|------------------------------------------------------------------|
| Object: [Contact ▼]  Path: [Via Company ▼]                       |
| Property: [Email ▼]  Label: [Shipping Contact ▼] (required)      |
+------------------------------------------------------------------+

Data Resolution at Runtime:
Deal → Company → Company's Contact Associations 
                    → Find contact with label "Shipping Contact"
                        → Return email property
```

## Benefits

1. **Flexible**: Supports any custom association label defined in HubSpot
2. **Extensible**: The `association_path` column allows future paths like `company_deal` or multi-hop associations
3. **Backward Compatible**: Existing mappings with no `association_path` continue to work as before
4. **Self-Documenting**: The UI clearly shows where the data comes from

## Testing Checklist

After implementation:
1. Create a mapping for "Ship To Email" using Contact + Via Company + Shipping Contact label
2. Save the mapping
3. Open a deal that has a company with a "Shipping Contact" labeled contact
4. Verify the email populates correctly on the document
5. Test with missing labels (should gracefully return empty)
6. Verify existing hardcoded shipping/AP/IT contacts still work
