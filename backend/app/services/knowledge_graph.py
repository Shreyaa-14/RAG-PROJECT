"""
Lightweight in-memory knowledge graph for tracking relationships
between ingested documents, entities, and modalities.
"""
from typing import Dict, List, Any, Optional
from collections import defaultdict
import json
import logging

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    def __init__(self):
        self.nodes: Dict[str, Dict] = {}       # node_id -> {type, label, metadata}
        self.edges: List[Dict] = []             # {source, target, relation}
        self.modality_index: Dict[str, List[str]] = defaultdict(list)

    def add_document_node(self, doc_id: str, source: str, modality: str, chunk_count: int):
        self.nodes[doc_id] = {
            "type": "document",
            "label": source,
            "modality": modality,
            "chunk_count": chunk_count,
        }
        self.modality_index[modality].append(doc_id)

    def add_chunk_node(self, chunk_id: str, doc_id: str, chunk_index: int, preview: str):
        self.nodes[chunk_id] = {
            "type": "chunk",
            "label": f"chunk_{chunk_index}",
            "preview": preview[:100],
        }
        self.edges.append({"source": doc_id, "target": chunk_id, "relation": "contains"})

    def link_related(self, id1: str, id2: str, relation: str = "related_to"):
        self.edges.append({"source": id1, "target": id2, "relation": relation})

    def get_graph_summary(self) -> Dict[str, Any]:
        modality_counts = {k: len(v) for k, v in self.modality_index.items()}
        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "documents_by_modality": modality_counts,
            "node_types": self._count_by_type(),
        }

    def _count_by_type(self) -> Dict[str, int]:
        counts: Dict[str, int] = defaultdict(int)
        for node in self.nodes.values():
            counts[node["type"]] += 1
        return dict(counts)

    def get_document_nodes(self) -> List[Dict]:
        return [
            {"id": nid, **ndata}
            for nid, ndata in self.nodes.items()
            if ndata["type"] == "document"
        ]

    def export_json(self) -> str:
        return json.dumps({
            "nodes": list(self.nodes.items()),
            "edges": self.edges,
        }, indent=2)


# Singleton graph instance
_graph = KnowledgeGraph()


def get_graph() -> KnowledgeGraph:
    return _graph
