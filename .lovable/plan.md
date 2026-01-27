
# Fix: Field Mapping Dropdown Causes Page Blank

## Problem Identified

The page blanks out when selecting an object in the Field Mapping dropdown due to two issues:

### Issue 1: Empty String Value in Select
In `FieldMappingRow` (line 389):
```tsx
<SelectItem value="">No label</SelectItem>
```
Radix UI Select components do **not support empty string values** - this causes a React crash.

### Issue 2: Missing Defensive Checks
When the property dropdown renders, it iterates over `selectedObjectData?.properties` without checking if the array is valid or if individual property items have required fields (`name`, `label`).

---

## Solution

### Fix 1: Replace Empty String Value with Placeholder
Change the "No label" option to use a non-empty placeholder value:
```tsx
// Before
<SelectItem value="">No label</SelectItem>

// After
<SelectItem value="__none__">No label</SelectItem>
```

Then update the handlers to treat `"__none__"` as equivalent to empty/null.

### Fix 2: Add Defensive Checks for Properties
Add null checks when rendering property options:
```tsx
{(selectedObjectData?.properties || [])
  .filter(prop => prop && prop.name && prop.label)
  .map((prop) => (
    <SelectItem key={prop.name} value={prop.name}>
      {prop.label}
    </SelectItem>
  ))}
```

### Fix 3: Handle Object Label Fallback
Ensure objects with missing labels don't crash:
```tsx
{Object.entries(objectOptions)
  .filter(([key, obj]) => obj && obj.label)
  .map(([key, obj]) => (
    <SelectItem key={key} value={key}>
      {obj.label}
    </SelectItem>
  ))}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/FieldMappingEditor.tsx` | Fix empty value, add defensive property/object checks |

---

## Code Changes

### In `FieldMappingRow` component:

1. **Object dropdown** (around line 353-359):
```tsx
{Object.entries(objectOptions)
  .filter(([_, obj]) => obj && obj.label)
  .map(([key, obj]) => (
    <SelectItem key={key} value={key}>
      {obj.label}
    </SelectItem>
  ))}
```

2. **Property dropdown** (around line 372-378):
```tsx
{(selectedObjectData?.properties || [])
  .filter((prop) => prop && prop.name && prop.label)
  .map((prop) => (
    <SelectItem key={prop.name} value={prop.name}>
      {prop.label}
    </SelectItem>
  ))}
```

3. **Association label dropdown** (around line 388-395):
```tsx
<SelectItem value="__none__">No label</SelectItem>
{(hubspotProperties?.associationLabels || [])
  .filter((label) => label && label.id && label.label)
  .map((label) => (
    <SelectItem key={label.id} value={label.id}>
      {label.label}
    </SelectItem>
  ))}
```

4. **Update handlers** to treat `"__none__"` as empty:
```tsx
const handleLabelChange = (value: string) => {
  const effectiveValue = value === '__none__' ? '' : value;
  setSelectedLabel(effectiveValue);
  if (selectedProperty) {
    onUpdate(fieldKey, selectedObject, selectedProperty, effectiveValue || undefined);
  }
};
```

---

## Testing After Fix
1. Navigate to Admin Settings > Field Mappings
2. Select an object from the dropdown (Company, Deal, Contact, etc.)
3. Verify the page does not blank out
4. Verify the property dropdown populates correctly
5. Test selecting a property and saving the mapping
