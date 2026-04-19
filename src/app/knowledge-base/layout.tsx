import DirectoryChatbot from '@/components/DirectoryChatbot';

export default function KnowledgeBaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DirectoryChatbot />
    </>
  );
}
