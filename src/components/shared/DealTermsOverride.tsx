import * as React from "react";
import { FileSignature } from "lucide-react";
import { SectionCard, Field } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface DealTermsOverrideProps {
  /** Whether custom (per-deal) terms are in effect instead of the org standard */
  enabled: boolean;
  /** The custom terms text for this deal */
  text: string;
  /** The organization standard terms for this document type (from Settings) */
  standardTerms?: string;
  onToggle: (value: boolean) => void;
  onChangeText: (value: string) => void;
}

/**
 * Per-deal Terms & conditions override.
 * Off: the document uses the standard company terms defined in Settings for this
 * document type. On: the document uses the custom text entered here, scoped to
 * this deal only. When switched on with an empty box, it seeds from the standard
 * terms so the user edits from the real baseline.
 */
export function DealTermsOverride({
  enabled,
  text,
  standardTerms,
  onToggle,
  onChangeText,
}: DealTermsOverrideProps) {
  React.useEffect(() => {
    if (enabled && !text && standardTerms) {
      onChangeText(standardTerms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <SectionCard
      title="Terms &amp; conditions"
      icon={FileSignature}
      description="Off uses the standard company terms from Settings. On uses custom terms for this deal only."
      action={
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground">Custom terms for this deal</span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </label>
      }
    >
      {enabled ? (
        <Field
          label="Custom terms text"
          hint="Applies to this deal only. Does not change the company standard."
        >
          <Textarea
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Enter the terms and conditions for this deal..."
            className="text-sm min-h-[160px]"
          />
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">
          This document uses the standard company terms defined in Settings. Turn on the toggle above to enter custom terms for this deal.
        </p>
      )}
    </SectionCard>
  );
}

export default DealTermsOverride;
