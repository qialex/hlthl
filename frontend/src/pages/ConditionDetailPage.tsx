import { useParams, useNavigate } from "react-router-dom";
import useSWR from "swr";
import {
  Title, Stack, Paper, Text, Alert, Group,
  Badge, ActionIcon, Select, Button, Anchor, Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconTrash, IconArrowLeft, IconEdit } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { fetcher, api } from "../lib/api";
import EntityForm from "../components/EntityForm";
import type { Condition, Symptom } from "@shared/types";

export default function ConditionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { data: condition, error: conditionError, mutate: mutateCondition } = useSWR<Condition>(
    id ? `/api/conditions/${id}` : null,
    fetcher
  );

  const { data: linked, error: linkedError, mutate: mutateLinked } = useSWR<Symptom[]>(
    id ? `/api/conditions/${id}/symptoms` : null,
    fetcher
  );

  const { data: allSymptoms } = useSWR<Symptom[]>("/api/symptoms", fetcher);

  const linkedIds = new Set(linked?.map((s) => s.id));
  const available = allSymptoms?.filter((s) => !linkedIds.has(s.id)) ?? [];

  const handleEditCondition = async (name: string) => {
    if (!id) return;
    await api.updateCondition(id, { name });
    await mutateCondition();
    notifications.show({ message: "Condition updated", color: "blue" });
    closeEdit();
  };

  const handleLink = async () => {
    if (!id || !selectedSymptomId) return;
    setLinking(true);
    try {
      await api.linkSymptom(id, selectedSymptomId);
      await mutateLinked();
      setSelectedSymptomId(null);
      notifications.show({ message: "Symptom linked", color: "green" });
    } catch (err) {
      notifications.show({ message: err instanceof Error ? err.message : "Failed", color: "red" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = (symptom: Symptom) => {
    if (!id) return;
    modals.openConfirmModal({
      title: "Unlink symptom",
      centered: true,
      children: (
        <Text size="sm">
          Remove <strong>{symptom.name}</strong> from this condition?
        </Text>
      ),
      labels: { confirm: "Unlink", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await api.unlinkSymptom(id, symptom.id);
        await mutateLinked();
        notifications.show({ message: "Symptom unlinked", color: "orange" });
      },
    });
  };

  if (conditionError) return <Alert color="red">Condition not found.</Alert>;

  return (
    <Stack gap="lg">
      <Anchor component="button" onClick={() => navigate("/conditions")} size="sm">
        <Group gap={4}><IconArrowLeft size={14} /> Back to conditions</Group>
      </Anchor>

      <Group gap="xs" align="center">
        <Title order={2}>{condition?.name ?? "Loading..."}</Title>
        {condition && (
          <ActionIcon variant="subtle" color="blue" onClick={openEdit} title="Edit condition">
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>

      <Modal opened={editOpened} onClose={closeEdit} title="Edit condition" centered>
        <EntityForm
          initialValue={condition?.name ?? ""}
          onSubmit={handleEditCondition}
          submitLabel="Save"
          onCancel={closeEdit}
        />
      </Modal>

      {linkedError && <Alert color="red" title="Error">{linkedError.message}</Alert>}

      <Paper withBorder p="lg">
        <Text size="sm" fw={500} mb="lg">Linked symptoms</Text>

        {linked?.length === 0 && (
          <Text c="dimmed" size="sm" mb="lg">No symptoms linked yet.</Text>
        )}

        <Group mb="lg" gap="xs" wrap="wrap">
          {linked?.map((symptom) => (
            <Badge
              key={symptom.id}
              variant="light"
              rightSection={
                <ActionIcon
                  size="xs"
                  variant="transparent"
                  color="red"
                  onClick={() => handleUnlink(symptom)}
                  title="Unlink"
                >
                  <IconTrash size={10} />
                </ActionIcon>
              }
            >
              {symptom.name}
            </Badge>
          ))}
        </Group>

        <Group align="flex-end">
          <Select
            placeholder="Select a symptom to link"
            data={available.map((s) => ({ value: s.id, label: s.name }))}
            value={selectedSymptomId}
            onChange={setSelectedSymptomId}
            disabled={available.length === 0}
            style={{ flex: 1 }}
          />
          <Button onClick={handleLink} loading={linking} disabled={!selectedSymptomId}>
            Link
          </Button>
        </Group>

        {available.length === 0 && linked && linked.length > 0 && (
          <Text c="dimmed" size="xs" mt="sm">All symptoms are already linked.</Text>
        )}
      </Paper>
    </Stack>
  );
}
