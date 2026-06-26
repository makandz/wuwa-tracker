import { CharacterEchoCheckerRoute } from "../../../tracker";

export default async function CharacterEchoCheckerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CharacterEchoCheckerRoute characterId={id} />;
}
