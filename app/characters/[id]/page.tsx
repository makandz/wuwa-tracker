import { CharacterDetailRoute } from "../../tracker";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CharacterDetailRoute characterId={id} />;
}
