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
import type { Symptom, Condition } from "@shared/types";

export default function SymptomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { data: symptom, error: symptomError, mutate: mutateSymptom } = useSWR<Symptom>(
    id ? `/api/symptoms/${id}` : null,
    fetcher
  );

  const { data: linked, error: linkedError, mutate: mutateLinked } = useSWR<Condition[]>(
    id ? `/api/symptoms/${id}/conditions` : null,
    fetcher
  );

  const { data: allConditions } = useSWR<Condition[]>("/api/conditions", fetcher);

  const linkedIds = new Set(linked?.map((c) => c.id));
  const available = allConditions?.filter((c) => !linkedIds.has(c.id)) ?? [];

  const handleEditSymptom = async (name: string) => {
    if (!id) return;
    await api.updateSymptom(id, { name });
    await mutateSymptom();
    notifications.show({ message: "Symptom updated", color: "blue" });
    closeEdit();
  };

  const handleLink = async () => {
    if (!id || !selectedConditionId) return;
    setLinking(true);
    try {
      await api.linkCondition(id, selectedConditionId);
      await mutateLinked();
      setSelectedConditionId(null);
      notifications.show({ message: "Condition linked", color: "green" });
    } catch (err) {
      notifications.show({ message: err instanceof Error ? err.message : "Failed", color: "red" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = (condition: Condition) => {
    if (!id) return;
    modals.openConfirmModal({
      title: "Unlink condition",
      centered: true,
      children: (
        <Text size="sm">
          Remove <strong>{condition.name}</strong> from this symptom?
        </Text>
      ),
      labels: { confirm: "Unlink", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await api.unlinkCondition(id, condition.id);
        await mutateLinked();
        notifications.show({ message: "Condition unlinked", color: "orange" });
      },
    });
  };

  if (symptomError) return <Alert color="red">Symptom not found.</Alert>;

  return (
    <Stack gap="lg">
      <Anchor component="button" onClick={() => navigate("/symptoms")} size="sm">
        <Group gap={4}><IconArrowLeft size={14} /> Back to symptoms</Group>
      </Anchor>

      <Group gap="xs" align="center">
        <Title order={2}>{symptom?.name ?? "Loading..."}</Title>
        {symptom && (
          <ActionIcon variant="subtle" color="blue" onClick={openEdit} title="Edit symptom">
            <IconEdit size={18} />
          </ActionIcon>
        )}
      </Group>

      <Modal opened={editOpened} onClose={closeEdit} title="Edit symptom" centered>
        <EntityForm
          initialValue={symptom?.name ?? ""}
          onSubmit={handleEditSymptom}
          submitLabel="Save"
          onCancel={closeEdit}
        />
      </Modal>

      {linkedError && <Alert color="red" title="Error">{linkedError.message}</Alert>}

      <Paper withBorder p="lg">
        <Text size="sm" fw={500} mb="lg">Linked conditions</Text>

        {linked?.length === 0 && (
          <Text c="dimmed" size="sm" mb="lg">No conditions linked yet.</Text>
        )}

        <Group mb="lg" gap="xs" wrap="wrap">
          {linked?.map((condition) => (
            <Badge
              key={condition.id}
              variant="light"
              color="teal"
              rightSection={
                <ActionIcon
                  size="xs"
                  variant="transparent"
                  color="red"
                  onClick={() => handleUnlink(condition)}
                  title="Unlink"
                >
                  <IconTrash size={10} />
                </ActionIcon>
              }
            >
              {condition.name}
            </Badge>
          ))}
        </Group>

        <Group align="flex-end">
          <Select
            placeholder="Select a condition to link"
            data={available.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedConditionId}
            onChange={setSelectedConditionId}
            disabled={available.length === 0}
            style={{ flex: 1 }}
          />
          <Button onClick={handleLink} loading={linking} disabled={!selectedConditionId}>
            Link
          </Button>
        </Group>

        {available.length === 0 && linked && linked.length > 0 && (
          <Text c="dimmed" size="xs" mt="sm">All conditions are already linked.</Text>
        )}
      </Paper>
    </Stack>
  );
}
