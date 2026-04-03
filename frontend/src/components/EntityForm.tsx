import { useState } from "react";
import { TextInput, Button, Group } from "@mantine/core";
import { NameSchema } from "@shared/schemas";

interface Props {
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function EntityForm({ initialValue = "", onSubmit, onCancel, submitLabel = "Save" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate using the shared Zod schema — same rules as the backend
    const result = NameSchema.safeParse({ name: value });
    if (!result.success) {
      setError(result.error.flatten().fieldErrors.name?.[0] ?? "Invalid");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(result.data.name);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Group align="flex-start" style={{ width: "100%" }}>
      <TextInput
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        error={error}
        placeholder="Name"
        style={{ flex: 1 }}
      />
      <Button onClick={handleSubmit} loading={loading}>
        {submitLabel}
      </Button>
      {onCancel && (
        <Button variant="subtle" color="gray" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </Group>
  );
}
