import { SandpackProvider, SandpackPreview, SandpackLayout } from "@codesandbox/sandpack-react";
import type { Files } from "@/lib/forge/changes";

export default function Preview({ files }: { files: Files }) {
  return (
    <SandpackProvider
      template="react-ts"
      theme="light"
      files={files}
      options={{ externalResources: ["https://cdn.tailwindcss.com"], recompileMode: "delayed", recompileDelay: 400 }}
      style={{ height: "100%", width: "100%" }}
    >
      <SandpackLayout style={{ height: "100%", width: "100%", border: 0, borderRadius: 0 }}>
        <SandpackPreview
          style={{ height: "100%", width: "100%", minWidth: 0 }}
          showOpenInCodeSandbox={false}
          showRefreshButton
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}