import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { Title, Stack, Text, Alert, Button, Group, TextInput, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { fetcher, api } from "../lib/api";
import EntityForm from "../components/EntityForm";
import EntityTable from "../components/EntityTable";
import type { Condition } from "@shared/types";

export default function ConditionsPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useSWR<Condition[]>("/api/conditions", fetcher);
  const [opened, { open, close }] = useDisclosure(false);
  const [filter, setFilter] = useState("");

  const handleCreate = async (name: string) => {
    await api.createCondition({ name });
    await mutate();
    notifications.show({ message: "Condition created", color: "green" });
    close();
  };

  const handleEdit = async (id: string, name: string) => {
    await api.updateCondition(id, { name });
    await mutate();
    notifications.show({ message: "Condition updated", color: "blue" });
  };

  const handleDelete = async (id: string) => {
    await api.deleteCondition(id);
    await mutate();
    notifications.show({ message: "Condition deleted", color: "red" });
  };

  const filtered = data?.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Conditions</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          Add condition
        </Button>
      </Group>

      <Modal opened={opened} onClose={close} title="Add condition" centered>
        <EntityForm onSubmit={handleCreate} submitLabel="Add" onCancel={close} />
      </Modal>

      {isLoading && <Text c="dimmed" size="sm">Loading...</Text>}
      {error && <Alert color="red" title="Error">{error.message}</Alert>}

      {data && data.length > 0 && (
        <TextInput
          placeholder="Filter conditions..."
          leftSection={<IconSearch size={16} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
        />
      )}

      {!isLoading && filtered.length === 0 && (
        <Text c="dimmed" size="sm">{filter ? "No matching conditions." : "No conditions yet."}</Text>
      )}
      {filtered.length > 0 && (
        <EntityTable
          items={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRowClick={(id) => navigate(`/conditions/${id}`)}
        />
      )}
    </Stack>
  );
}
