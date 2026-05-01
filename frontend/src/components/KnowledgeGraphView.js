import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import axios from "axios";

export default function KnowledgeGraphView() {
  const [graphData, setGraphData] = useState({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/v1/graph")
      .then((res) => {
        const documents = res.data.documents || [];
        const edges = res.data.edges || [];

        const nodes = [];
        const links = [];

        documents.forEach((doc) => {
          nodes.push({
            id: doc.id,
            name: doc.filename || "Document",
            type: "document",
          });
        });

        edges.forEach((edge) => {
          nodes.push({
            id: edge.target,
            name: edge.target,
            type: "chunk",
          });

          links.push({
            source: edge.source,
            target: edge.target,
          });
        });

        setGraphData({ nodes, links });
      })
      .catch((err) => {
        console.error("Graph fetch error:", err);
      });
  }, []);

  return (
    <div style={{ height: "380px", background: "#ffffff", borderRadius: "20px", overflow: "hidden" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="type"
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
}