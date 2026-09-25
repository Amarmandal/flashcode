import { IconCode } from '@tabler/icons-react';
import { EmptyState } from './EmptyState';
interface NoDataProps { message?: string; iconSize?: number; }
export function NoData({ message = 'Try another search or add something new.', iconSize = 28 }: NoDataProps) {
  return <EmptyState title="Nothing here yet" description={message} icon={<IconCode size={iconSize} stroke={1.5} />} />;
}
