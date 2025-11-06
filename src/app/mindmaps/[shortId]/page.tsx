import { MindmapEditor } from "@/components/mindmap/mindmap-editor-container";

interface MindmapPageProps {
  params: Promise<{
    shortId: string;
  }>;
}

export default async function MindmapPage({ params }: MindmapPageProps) {
  const { shortId } = await params;

  return <MindmapEditor mindmapId={shortId} />;
}
