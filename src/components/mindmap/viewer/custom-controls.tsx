import { useCommand } from "@/domain/mindmap-store";
import { Plus, Minus, Maximize, Focus } from "lucide-react";
import { Panel } from "@xyflow/react";

export function CustomControls() {
  const zoomIn = useCommand("view.zoomIn");
  const zoomOut = useCommand("view.zoomOut");
  const fitView = useCommand("view.fitView");
  const focusNode = useCommand("view.focusCurrentNode");

  return (
    <Panel position="bottom-left" data-testid="mindmap-custom-controls">
      <div className="react-flow__controls">
        <button
          className="react-flow__controls-button react-flow__controls-zoomin"
          onClick={() => zoomIn()}
          title="Zoom In (Cmd+=)"
          type="button"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          className="react-flow__controls-button react-flow__controls-zoomout"
          onClick={() => zoomOut()}
          title="Zoom Out (Cmd+-)"
          type="button"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          className="react-flow__controls-button react-flow__controls-fitview"
          onClick={() => fitView()}
          title="Fit View (Cmd+1)"
          type="button"
        >
          <Maximize className="w-3 h-3" />
        </button>
        <button
          className="react-flow__controls-button"
          onClick={() => focusNode()}
          title="Focus Current Node (Cmd+L)"
          type="button"
        >
          <Focus className="w-3 h-3" />
        </button>
      </div>
    </Panel>
  );
}
