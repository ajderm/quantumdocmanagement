-- The Eakes lease document as Eakes actually issue it.
--
-- Sourced from the signed Cornerstone Bank agreement of 4/24/2026 and the
-- Hometown worksheet that accompanies it, both shared on 2026-09-04. Earlier
-- versions of this template were built from page 1 of that PDF alone; pages
-- 2 to 4 carry the terms, the letter of instruction and Exhibit A, and going
-- unread is why this app printed invented terms and a guessed tax rate.
--
-- Three corrections, each verified to the cent against the signed agreement:
--
--   1. Sales tax applies to the MONTHLY PAYMENT, not the equipment subtotal.
--      Their form reads "Monthly Payment + Sales Tax = Total Monthly Payment",
--      87.75 + 6.14 = 93.89.
--   2. The payment derives from the equipment total alone, not from a
--      tax-inclusive grand total: 4,391.84 x 0.019980 = 87.75.
--   3. Exhibit A carries no pricing. Andrea Villela, 8/31: "Exhibit A lists
--      the items but carries no prices." The Amount column exists only on the
--      internal CLT input sheet. The table now binds their own columns --
--      Qty, Make & Model / Description, Serial, Initial Meter, Location --
--      and the rate factor comes off the customer page entirely.
--
-- Their real terms and their real tax rate (7.00%, stated on the Hometown
-- worksheet as "Sales Tax Rate = 7%" and on the CLT sheet as "Tax Rate
-- 7.00%") are seeded for THEIR portal only. Both are dealer data, not
-- template content, so no other tenant is touched.

begin;

-- Eakes' own terms, verbatim from page 2 of the signed agreement
-- ("Lease Terms and Conditions", Version 260123 1/23/2026).
insert into public.document_terms (dealer_account_id, document_type, terms_and_conditions, updated_at)
select da.id, t.document_type, $terms$Lessee accepts and acknowledges receipt of the said property in good condition and promises and agrees that during the term of this lease and all renewals to keep and maintain the same in good order and repair and to bear the expense of all necessary repairs, maintenance, operation and replacement and to return said equipment (or its value) to Lessor upon termination. Lessee agrees any and all replacements, parts, additions, repairs and accessories incorporated in or affixed to said property shall become the property of the Lessor. Lessee assumes the entire risk of loss from hazard and agrees to keep the property insured at Lessee's expense to protect all interests of Lessor against such risks, including the liability of Lessor for public liability and property damage. The proceeds of such insurance, whether resulting from loss or damage, or otherwise, shall be applied toward the replacement or repair of the said property or the discharge of the obligations of Lessee hereunder at the option of Lessor. Lessee shall indemnify and save Lessor harmless from any and all liability arising out of the use, maintenance and/or delivery of the property. Lessee shall comply and conform to all laws, ordinances and regulations relating to the possession, use or maintenance of the property, and save Lessor harmless against actual or asserted violations and pay all cost and expenses of any character occasioned by and arising out of such violations. The Lessee will pay promptly when due all taxes, including but not limited to personal property taxes, and other public or private charges against or upon the property as additional rental therefore, and if paid by Lessor will reimburse Lessor therefore.

Lessee acknowledges that title to said property is vested in the Lessor and no title or right in said property shall pass to the Lessee except the rights herein expressly granted. Said property is deemed to be personal property even though the property may become attached to any real estate. Lessee shall not permit any encumbrance, lien or levy to be made on said property, and Lessee shall not use or permit said property to be used in violation of any State or Federal laws. The Lessee shall not assign this lease nor attempt to sell, mortgage, sublet or pledge the property. Customer accepts the Equipment with the Manufacturer's Warranty which applies to it at the commencement of this lease. EAKES DOES NOT MAKE ANY ADDITIONAL WARRANTY OF THE EQUIPMENT AND, WITHOUT LIMITATION, MAKES NO WARRANTY THAT THE EQUIPMENT IS SUITABLE FOR ANY PARTICULAR USE.

Time is of the essence hereof and if Lessee shall fail to pay any rental as herein provided, or if Lessee shall default in performance of or fail to observe, keep or perform any other provision of this lease required to be observed, kept or performed by Lessee, or if Lessee ceases doing business as a going concern, or if a petition is filed by or against Lessee under the Acts of Congress Relating to Bankruptcy or any amendment thereto, or if Lessee shall make an assignment for the benefit of creditors or take advantage of any law for the relief of debtors, or if a receiver or any officer of the court be appointed to have control of creditors or take advantage of any law for the relief of debtors, or if a receiver or any officer of the court be appointed to have control of the property or assets of the Lessee, or if Lessor shall deem the property in jeopardy or feel insecure, the full amount of rent then unpaid hereunder shall become due and payable forthwith and Lessor may at its option, and in addition to and without prejudice to any other remedy, without notice or demand and without legal process, take possession of such property wherever it may be located (with all additions and substitutions), whereupon all rights of Lessee to said property shall terminate absolutely.Any such repossession shall constitute a termination of this lease, and if such repossession is made and the lease is so terminated the Lessee agrees that the Lessor is entitled to damages in an amount equal to the total amount due under this lease from Lessee to Lessor minus the amount already paid by Lessee to Lessor upon this lease. Any mitigation of damages shall be computed so that Lessor receives its full net rental as herein anticipated after recouping all cost and expenses of Lessor in repossessing, re-leasing, transporting, repairing, selling, or otherwise handling said property, including attorneys expenses of Lessor in repossessing, re-leasing, transporting, repairing, selling, or otherwise handling said property, including attorneys fees.

The following options are available for this agreement: (a.) If not in default you may purchase the Equipment,“ASIS, WHEREIS”and WITHOUT ANY WARRANTY AS TO CONDITION OR VALUE at the end of the lease term for the Purchase Option indicated in the Letter of Instruction attached to this Agreement (i.e. either a set dollar amount or the Fair Market Value of the Equipment at the leaseterm’sconclusion) plus all applicable taxes. (b.) Unless either party provides notice at least thirty (30) days before the end of the lease term of its intention not to renew this Agreement, it will be renewed automatically on a month-to-month basis at the same price, terms and conditions and billing frequency as the original Agreement. During this renewal period, either party may terminate this Agreement upon at least thirty (30) days notice. (c.) Upon termination pursuant to b, above, and if Lessee has not purchased the Equipment, Lessee shall immediately deliver all equipment to Lessor at such location within the continental United States as Lessor shall delegate. At the time of return, the Equipment shall be in the same condition as when delivered, reasonable wear and tear excepted, together with any software.

No delay or omission to exercise any right, power or remedy accruing to Lessor upon any breach or default by Lessee under this lease shall impair any such right, power or remedy of Lessor, nor shall be construed as a waiver, of any such breach or default, or of any similar breach or default be deemed a waiver of any subsequent breach or default. All waivers under this lease must be in writing. All remedies breach or default be deemed a waiver of any subsequent breach or default. All waivers under this lease must be in writing. All remedies either under this lease or by-law afforded to Lessor shall be cumulative and not alternate.

Dishonored Item Fee. Lessee agrees to pay a fee to Lessor or Assignee of $25.00 ifLessee’spayment or preauthorized charge with which Lessee pays is later dishonored. Late Charge. If a payment is 10 days or more late, Lessee will be charged 5.000% of the regularly scheduled payment or $5.00, whichever is greater.

The parties hereto expressly agree that this Agreement will be governed by, interpreted under, and construed and enforced exclusively in accordance with the laws of the State of Nebraska and that venue for disputes shall be in the courts of Hall County, Nebraska.$terms$, now()
from public.dealer_accounts da
cross join (values ('quote_fmv'), ('quote_dollar_buyout'), ('fmv_lease')) as t(document_type)
where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_type) do update
  set terms_and_conditions = excluded.terms_and_conditions,
      updated_at = now();

-- Their sales tax rate, entered as a percent the way the settings field takes it.
insert into public.dealer_settings (dealer_account_id, setting_key, setting_value, updated_at)
select da.id, 'sales_tax_rate', '"7"'::jsonb, now()
from public.dealer_accounts da
where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, setting_key) do update
  set setting_value = excluded.setting_value, updated_at = now();

update public.render_templates
   set is_published = false, updated_at = now()
 where document_code = 'quote' and is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'quote', 'Lease Agreement (Eakes)', 6,
       $tmpl${
  "id": "tmpl_eakes_lease_v1",
  "name": "Equipment Lease Quotation (Eakes)",
  "page": {
    "size": "letter",
    "orientation": "portrait",
    "margins": {
      "top": 1.15,
      "right": 0.6,
      "bottom": 0.6,
      "left": 0.6
    }
  },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": [
      "{{dealer.address}}",
      "{{dealer.phone}} · {{dealer.website}}"
    ],
    "right": [
      "QUOTATION {{deal.quote_number}}",
      "Contract date {{today | date:medium}}"
    ],
    "footerNote": "{{dealer.company}} · {{company.name}} · Quote {{deal.quote_number}}"
  },
  "styles": {
    "fontFamily": "Arial, Helvetica, sans-serif",
    "fontSize": 9
  },
  "computed": {
    "monthly": "firstNonZero(lease.payment, round(amounts.taxable * lease.rate_factor, 2))",
    "payment_tax": "round(computed.monthly * dealer.tax_rate, 2)",
    "total_monthly": "firstNonZero(computed.monthly + computed.payment_tax, computed.monthly)"
  },
  "blocks": [
    {
      "type": "docTitle",
      "title": "Equipment Lease Quotation",
      "meta": [
        {
          "label": "Contract date",
          "value": "{{today | date}}"
        },
        {
          "label": "Quote",
          "value": "{{deal.quote_number}}"
        },
        {
          "label": "Valid through",
          "value": "{{deal.close_date | date}}"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Lessee Information",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Full legal name",
          "value": "{{company.name}}",
          "full": true
        },
        {
          "label": "Billing address",
          "value": "{{company.street}}",
          "full": true
        },
        {
          "label": "City",
          "value": "{{company.city}}"
        },
        {
          "label": "County",
          "value": "{{company.county}}"
        },
        {
          "label": "State",
          "value": "{{company.state}}"
        },
        {
          "label": "Zip",
          "value": "{{company.zip}}"
        },
        {
          "label": "Phone",
          "value": "{{company.phone}}"
        },
        {
          "label": "Project",
          "value": "{{deal.name}}"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Equipment Location",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Street address",
          "value": "{{location.street}}",
          "full": true
        },
        {
          "label": "City",
          "value": "{{location.city}}"
        },
        {
          "label": "County",
          "value": "{{location.county}}"
        },
        {
          "label": "State",
          "value": "{{location.state}}"
        },
        {
          "label": "Zip",
          "value": "{{location.zip}}"
        },
        {
          "label": "Site contact",
          "value": "{{contact.ship_to}}"
        }
      ]
    },
    {
      "type": "richText",
      "keepTogether": true,
      "html": "<p><em>Equipment shall not be removed from this location without written consent of Lessor.</em></p>"
    },
    {
      "type": "table",
      "title": "Equipment Information",
      "bind": "line_items",
      "columns": [
        {
          "key": "quantity",
          "label": "Qty",
          "width": "8%",
          "align": "right"
        },
        {
          "key": "name",
          "label": "Make & Model / Description",
          "width": "46%"
        },
        {
          "key": "serial",
          "label": "Serial Number",
          "width": "18%"
        },
        {
          "key": "meter",
          "label": "Initial Meter",
          "width": "13%",
          "align": "right"
        },
        {
          "key": "site",
          "label": "Location",
          "width": "15%"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Term & Payment Information",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Lessor",
          "value": "{{lease.partner}}"
        },
        {
          "label": "Lease type",
          "value": "{{lease.type}}"
        },
        {
          "label": "Term",
          "value": "{{lease.term}} months"
        },
        {
          "label": "Salesperson",
          "value": "{{rep.name}}"
        }
      ]
    },
    {
      "type": "summary",
      "hideEmpty": true,
      "rows": [
        {
          "label": "Monthly payment",
          "expr": "computed.monthly"
        },
        {
          "label": "Sales tax ({{dealer.tax_rate | percent}})",
          "expr": "computed.payment_tax"
        },
        {
          "label": "Total monthly payment",
          "expr": "computed.total_monthly",
          "bold": true,
          "rule": true
        }
      ]
    },
    {
      "type": "richText",
      "title": "Terms & Conditions",
      "html": "{{terms.html}}",
      "hideEmpty": true
    },
    {
      "type": "signature",
      "title": "Customer Signature",
      "signers": [
        {
          "label": "{{company.name}}",
          "sublabel": "Authorized signature · Title · Date"
        },
        {
          "label": "For {{dealer.company}}",
          "sublabel": "Salesperson {{rep.name}}"
        }
      ]
    }
  ]
}$tmpl$::jsonb, true,
       'Rebuilt from the signed Cornerstone Bank agreement: tax on the monthly payment, no pricing on Exhibit A.',
       'system'
from public.dealer_accounts da
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;
