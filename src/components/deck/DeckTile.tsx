import { ReactNode } from 'react';
import { ActionIcon, Box, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { IconArrowUpRight, IconDots, IconPencil, IconStar, IconTrash } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import classes from '../common/Page.module.css';
interface DeckTileProps { name: string; href: string; icon: ReactNode; description: string; favorite: boolean; onFavorite: () => void; onEdit: () => void; onDelete: () => void; children?: ReactNode; }
export function DeckTile({ name, href, icon, description, favorite, onFavorite, onEdit, onDelete, children }: DeckTileProps) {
  return <Card className={classes.deck}>
    <Stack gap="lg">
      <Group justify="space-between"><Box className={classes.deckIcon}>{icon}</Box><Group gap={4}>
        <ActionIcon variant="subtle" color={favorite ? 'yellow' : 'gray'} aria-label={favorite ? `Unfavorite ${name}` : `Favorite ${name}`} onClick={onFavorite}><IconStar size={18} fill={favorite ? 'currentColor' : 'none'} /></ActionIcon>
        <Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${name}`}><IconDots size={18} /></ActionIcon></Menu.Target>
          <Menu.Dropdown><Menu.Item leftSection={<IconPencil size={15} />} onClick={onEdit}>Rename deck</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={onDelete}>Delete deck</Menu.Item></Menu.Dropdown>
        </Menu>
      </Group></Group>
      <Box><Link className={classes.deckLink} to={href}>{name}</Link><Text size="xs" c="dimmed" mt={5}>{description}</Text></Box>
      <Group justify="space-between" pt="sm"><Box>{children}</Box><ActionIcon component={Link} to={href} variant="light" aria-label={`Open ${name}`}><IconArrowUpRight size={18} /></ActionIcon></Group>
    </Stack>
  </Card>;
}
