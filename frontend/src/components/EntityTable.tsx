import { useState } from "react";
import { Table, ActionIcon, Group, Text, Anchor, Modal } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import EntityForm from "./EntityForm";

interface Entity {
  id: string;
  name: string;
}

interface Props {
  items: Entity[];
  onEdit: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRowClick?: (id: string) => void;
}

export default function EntityTable({ items, onEdit, onDelete, onRowClick }: Props) {
  const [editingItem, setEditingItem] = useState<Entity | null>(null);

  return (
    <>
      <Modal
        opened={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title="Edit"
        centered
      >
        {editingItem && (
          <EntityForm
            initialValue={editingItem.name}
            submitLabel="Save"
            onSubmit={async (name) => {
              await onEdit(editingItem.id, name);
              setEditingItem(null);
            }}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Modal>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th w={96}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>
                {onRowClick ? (
                  <Anchor component="button" onClick={() => onRowClick(item.id)} size="sm">
                    {item.name}
                  </Anchor>
                ) : (
                  <Text size="sm">{item.name}</Text>
                )}
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => setEditingItem(item)}
                    title="Edit"
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() =>
                      modals.openConfirmModal({
                        title: "Delete",
                        centered: true,
                        children: (
                          <Text size="sm">
                            Are you sure you want to delete <strong>{item.name}</strong>?
                          </Text>
                        ),
                        labels: { confirm: "Delete", cancel: "Cancel" },
                        confirmProps: { color: "red" },
                        onConfirm: () => onDelete(item.id),
                      })
                    }
                    title="Delete"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
