-- Tascosa: Customer Network Survey and Installation Agreement, as a custom document.
--
-- Source: "5. Tascosa Customer Network Survey and Installation Agreement
-- (edit v2026.09.09.3.1).docx", shared by Stephen Ross 9 Sep 2026 in the
-- required-documents sample folder. Item 5 of the nine documents his 8 Sep
-- email lists as required for every sale.
--
-- Why custom_documents and not render_templates:
-- this is a data-entry form, not a render of deal data. A rep types roughly
-- sixty values on it -- IP addressing, SMTP settings, print deployment, a
-- pre-installation checklist -- none of which exist in HubSpot. custom_documents
-- gives them CustomDocumentForm to fill in and persists answers per deal in
-- custom_document_configurations; render_templates has no input surface.
--
-- Scoped to Tascosa's portal only, via dealer_accounts. Every seed here must
-- carry that filter: an Eakes template once published without one and surfaced
-- in other portals (see 20260911090000_fix_eakes_template_portal_leak.sql).
-- This touches no shared renderer code, so Eakes is unaffected.
--
-- Field mappings use source 'existing' against EXISTING_DOCUMENT_FIELDS in
-- src/components/admin/types.ts, so the customer, ship-to and IT-contact blocks
-- pre-fill from the record. Everything the app cannot know is 'manual'.
--
-- The equipment table's Serial column maps to line-item `serialNumber`. The
-- builder's property dropdown does not list it, but TableSectionRenderer
-- resolves `item.properties?.[p] || item[p]`, so it populates; when a line item
-- carries no serial the cell is blank for the technician to complete on site,
-- which is how the paper form is used.
--
-- The ninety-day terms live in terms_and_conditions, not in the schema, so a
-- dealer can revise them without touching the layout.

begin;

insert into public.custom_documents
  (dealer_account_id, code, name, icon, description, is_active, sort_order,
   terms_and_conditions, schema)
select
  da.id,
  'network_survey',
  'Network Survey',
  'ClipboardCheck',
  'Customer Network Survey and Installation Agreement — completed and returned before installation is scheduled.',
  true,
  60,
  $terms$1. General: Tascosa Office Machines will provide the following connectivity support of the device at no additional charge to the customer for a period of ninety (90) days effective from the date of installation.
a. Installation, configuration assistance and training to IT Personnel and key operator for your hardware/software solution.
b. Tascosa will install and configure print drivers and applicable software on the customer's server and four (4) client workstations. This also applies to peer to peer, or to direct print environments. If the customer requests additional workstations, then additional charges will apply.
c. The installation will be deemed complete if Tascosa personnel provides to Customer a Windows test print page or scanned image from device(s).
d. Tascosa may activate and use monitoring software to provide meter readings as well as report service issues and provide supply levels for networked equipment. If this service is declined by the customer for any reason, there may be additional fees.

2. Exclusions: Under no circumstances will Tascosa be considered responsible for:
a. Re-Coding or modifying applications or application output.
b. Training on the customer's installed operating systems or applications.
c. File corruptions or file errors that cause inconsistent output.
d. Any losses incurred by the customer or other entities for configuration support or trouble shooting related to the hardware or software supplied by Tascosa.
e. Virus protection.

3. Customer Responsibilities:
a. Customer is responsible for maintaining a current backup of program and data files to restore lost data. Tascosa, nor its assignees, may be held responsible for any loss of data or loss of use due to the installation and configuration of device(s) and its associated software.
b. Customer is responsible for all network cabling and electrical wiring required for the equipment.
c. Customer is responsible for a suitable physical and electrical environment for the equipment.
d. Customer is responsible for providing personnel with enough knowledge of the network and applications.
e. Customer is responsible for maintaining all software installed by Tascosa, or its assignees, including but not limited to, all licensing.
f. Customer is required to secure and maintain all virus detection/malware protection and firewalls for these devices and their resident network.

4. Diagnostic Services: Tascosa may charge current hourly rates if it is determined that proper installation and operations may not be achieved due to causes beyond its control. Examples include but are not limited to:
a. Defective cabling.
b. Defective network components.
c. Password changes.$terms$,
  $schema${
  "sections": [
    {
      "id": "sec_header",
      "type": "header",
      "title": "Customer Network Survey and Installation Agreement",
      "showDealerLogo": true,
      "showDealerAddress": true
    },
    {
      "id": "sec_customer",
      "type": "fields",
      "title": "Customer Information",
      "fields": [
        { "id": "customer_name", "label": "Customer Name", "type": "text", "required": true, "width": "half", "mapping": { "source": "existing", "existingFieldKey": "companyName" } },
        { "id": "main_phone", "label": "Main Phone Number", "type": "text", "required": false, "width": "half", "mapping": { "source": "existing", "existingFieldKey": "companyPhone" } },
        { "id": "equipment_address", "label": "Equipment Address", "type": "text", "required": true, "width": "full", "mapping": { "source": "existing", "existingFieldKey": "shipToAddress" } },
        { "id": "city", "label": "City", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToCity" } },
        { "id": "state", "label": "State", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToState" } },
        { "id": "zip", "label": "Zip", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToZip" } },
        { "id": "department_location", "label": "Department / Building / Location", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "room_number", "label": "Room #", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "main_contact", "label": "Main Contact", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToContact" } },
        { "id": "main_contact_email", "label": "Main Contact Email", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToEmail" } },
        { "id": "main_contact_phone", "label": "Main Contact Phone", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "shipToPhone" } },
        { "id": "it_contact", "label": "IT Contact", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "itContactName" } },
        { "id": "it_contact_email", "label": "IT Contact Email", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "itContactEmail" } },
        { "id": "it_contact_phone", "label": "IT Contact Phone", "type": "text", "required": false, "width": "third", "mapping": { "source": "existing", "existingFieldKey": "itContactPhone" } },
        { "id": "has_network_support", "label": "Customer has network support that can help answer these questions", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_equipment",
      "type": "table",
      "title": "Equipment Purchased",
      "maxRows": 12,
      "columns": [
        { "id": "make_model", "label": "Manufacturer & Model", "mapping": { "source": "line_item", "property": "description" } },
        { "id": "serial", "label": "Copier ID / Serial Number", "mapping": { "source": "line_item", "property": "serialNumber" } },
        { "id": "meter_method", "label": "Meter Method", "mapping": { "source": "manual" } },
        { "id": "additional_software", "label": "Additional Software Solutions", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_preinstall",
      "type": "fields",
      "title": "Customer Responsibility: Pre-Installation Checklist",
      "fields": [
        { "id": "pre_outlet", "label": "An appropriate electrical outlet is available at the planned equipment location", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "pre_patch_cable", "label": "A network patch cable is available from the data jack to the device", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "pre_clearance", "label": "There is sufficient clearance for operation, service access, and paper-path / jam access", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "pre_receptacle_type", "label": "Receptacle type for the MFP outlet", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_capabilities",
      "type": "fields",
      "title": "Requested Machine Capabilities",
      "fields": [
        { "id": "cap_print", "label": "Users will print from computers to the MFP", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "cap_scan_folder", "label": "Scan to Network Folder", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "cap_scan_locations", "label": "Number of scan locations", "type": "number", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "cap_accounting", "label": "MFP will use User, Department ID, or Job Accounting", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "cap_accounting_tracking", "label": "Tracking method", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "cap_scan_email", "label": "Scan to Email (a dedicated email account must be provided for the copier)", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "cap_fax", "label": "Faxing / forwarding to email or network folder", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "cap_fax_number", "label": "Fax #", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_support_note",
      "type": "text_block",
      "title": "Customer Network Support",
      "content": "Functionality may be limited by the unit's configuration, available features, network security, and customer network permissions. Tascosa will install and configure print drivers, Scan to Folder, Scan to Email, and applicable software on the customer's server and four client workstations. Additional workstation setup, mobile printing apps, and support outside the standard installation scope may be billable. A network administrator or equivalent contact should be available on the installation date. Sensitive user IDs and passwords should not be listed on this survey, but they must be available to the technician while onsite."
    },
    {
      "id": "sec_network",
      "type": "fields",
      "title": "Network Addressing, Print Deployment, Scan and Fax Configuration",
      "fields": [
        { "id": "net_deployment_method", "label": "Print deployment method", "type": "dropdown", "required": false, "width": "half", "options": ["Server-based queue", "Direct TCP/IP", "Peer-to-peer", "Other"], "mapping": { "source": "manual" } },
        { "id": "net_deployment_other", "label": "If Other, describe", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "net_who_installs", "label": "Are end users permitted to add / install printers, or is deployment handled by IT / GPO / script / RMM?", "type": "text", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "net_print_server_os", "label": "Print server OS / version, if applicable", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "net_user_count", "label": "Estimated number of print users / devices", "type": "number", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "net_client_windows", "label": "Client OS — Windows", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_client_macos", "label": "Client OS — macOS", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_client_other", "label": "Client OS — Other", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_ip_method", "label": "IP configuration method", "type": "dropdown", "required": false, "width": "full", "options": ["DHCP reservation / automatic address assignment", "Static TCP/IP configuration"], "mapping": { "source": "manual" } },
        { "id": "net_ip", "label": "IP Address", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_subnet", "label": "Subnet Mask", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_gateway", "label": "Gateway", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_dns_primary", "label": "Primary DNS", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_dns_secondary", "label": "Secondary DNS", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_domain", "label": "Domain", "type": "text", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "net_mac_note", "label": "MAC address provided to the IT contact", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_mobile",
      "type": "fields",
      "title": "Mobile / USB Printing",
      "fields": [
        { "id": "mob_apple", "label": "Printing from Apple devices permitted", "type": "checkbox", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "mob_android", "label": "Printing from Android devices permitted", "type": "checkbox", "required": false, "width": "third", "mapping": { "source": "manual" } },
        { "id": "mob_usb", "label": "Printing from / scanning to USB drives permitted", "type": "checkbox", "required": false, "width": "third", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_scan_folder",
      "type": "fields",
      "title": "Scan to Network File / Folder",
      "fields": [
        { "id": "scan_user", "label": "User (account requires Read / Write / Modify on the target folders)", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "scan_password", "label": "Password", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_scan_email_note",
      "type": "text_block",
      "title": "Scan to Email",
      "content": "If using scan to email, provide an email address dedicated to the copier rather than one you use — for example \"[yourcompanyname]scanner@gmail.com\". Because Google/Gmail requires Multi-Factor Authentication, a mobile number MUST be associated with the copier's email address; scan to email using Gmail will not work without this. The MFA contact and mobile device need to be available, preferably on site, during installation."
    },
    {
      "id": "sec_scan_email",
      "type": "fields",
      "title": "Scan to Email Configuration",
      "fields": [
        { "id": "mail_provider", "label": "Email Provider", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_auth_required", "label": "Authentication required", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_smtp", "label": "SMTP Server", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_ssl", "label": "SSL / TLS required", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_port", "label": "Outgoing Port", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_port_non25", "label": "Port other than 25", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_copier_address", "label": "Email address for copier", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_user", "label": "User", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_mfa_contact", "label": "MFA Contact Name / Title", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "mail_mfa_mobile", "label": "MFA Mobile #", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_terms",
      "type": "terms",
      "title": "Terms and Conditions During the First 90 Days",
      "showTerms": true
    },
    {
      "id": "sec_completion",
      "type": "fields",
      "title": "Installation Completion",
      "fields": [
        { "id": "done_satisfaction", "label": "The items indicated have been installed and completed to my satisfaction, and I have read and agree to the Terms and Conditions listed", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "done_workstations", "label": "The agreed number of workstations have been set up to print to the device", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "done_additional_billable", "label": "I understand additional workstations needing print drivers or scan to folder, if done by Tascosa rather than my IT staff, are billed at their current hourly rate", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } },
        { "id": "done_scan_folder_tested", "label": "Scan to Folder was set up and tested", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "done_scan_folder_reason", "label": "If not, explain", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "done_scan_email_tested", "label": "Scan to Email was set up and tested", "type": "checkbox", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "done_scan_email_reason", "label": "If not, explain", "type": "text", "required": false, "width": "half", "mapping": { "source": "manual" } },
        { "id": "done_network_changes_billable", "label": "I understand that changes on our network side which stop printing, scan to folder or scan to email from working, and require Tascosa support to correct, will be a billable call at their current hourly rate", "type": "checkbox", "required": false, "width": "full", "mapping": { "source": "manual" } }
      ]
    },
    {
      "id": "sec_sign_dealer",
      "type": "signature",
      "title": "Authorization — Tascosa Office Machines, Inc.",
      "signerLabel": "Tascosa Office Machines, Inc.",
      "includeDateLine": true
    },
    {
      "id": "sec_sign_customer",
      "type": "signature",
      "title": "Authorization — Customer",
      "signerLabel": "Customer Authorized Signature",
      "includeDateLine": true
    }
  ]
}$schema$::jsonb
from public.dealer_accounts da
where da.hubspot_portal_id = '244111826'
on conflict (dealer_account_id, code) do update
  set name                  = excluded.name,
      icon                  = excluded.icon,
      description           = excluded.description,
      is_active             = excluded.is_active,
      sort_order            = excluded.sort_order,
      terms_and_conditions  = excluded.terms_and_conditions,
      schema                = excluded.schema,
      updated_at            = now();

-- The insert above selects from dealer_accounts, so a missing or renamed portal
-- silently writes nothing. Say so rather than appearing to succeed.
do $$
begin
  if not exists (
    select 1
      from public.custom_documents cd
      join public.dealer_accounts da on da.id = cd.dealer_account_id
     where da.hubspot_portal_id = '244111826'
       and cd.code = 'network_survey'
  ) then
    raise warning 'Network Survey was not seeded: no dealer_accounts row for hubspot_portal_id 244111826.';
  end if;
end $$;

commit;
