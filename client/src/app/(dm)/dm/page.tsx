import { redirect } from 'next/navigation';

export default function DmRoot() {
  redirect('/dm/pending');
}
