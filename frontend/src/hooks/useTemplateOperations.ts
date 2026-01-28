import { useState, useCallback } from 'react';
import { apiFetch } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTemplateOperations = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all available templates from the backend
   */
  const fetchTemplates = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/level/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Clone a template with all its levels
   */
  const cloneTemplate = useCallback(async (fromTemplate: string, toTemplate: string): Promise<boolean> => {
    if (!token) {
      toast.error('Authentication required');
      return false;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/level/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fromTemplate, toTemplate })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Template cloned successfully');
        return true;
      } else {
        toast.error(data.message || 'Failed to clone template');
        return false;
      }
    } catch (err) {
      console.error('Error cloning template:', err);
      toast.error('An error occurred while cloning the template');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Save all 5 levels to the database for a given template
   */
  const saveAllLevels = useCallback(async (
    templateName: string,
    nodes: any[],
    edges: any[]
  ): Promise<boolean> => {
    if (!token) {
      toast.error('Authentication required');
      return false;
    }

    setLoading(true);

    try {
      const MAX_LEVEL = 5;

      // Save each level (1 through 5)
      for (let levelNum = 1; levelNum <= MAX_LEVEL; levelNum++) {
        // Filter nodes by level (include nodes with level <= current level)
        const filteredNodes = nodes
          .filter((node: any) => {
            const nodeLevel = node?.data?.level ?? 1;
            return nodeLevel <= levelNum;
          })
          .map((node: any) => {
            // Clean node data structure
            const cleanNode: any = {
              id: node.id,
              type: node.type,
              data: {
                label: node.data.label,
                logo: node.data.logo,
                handles: node.data.handles,
              },
              position: {
                x: Math.round(node.position.x),
                y: Math.round(node.position.y)
              },
              sourcePosition: node.sourcePosition,
              targetPosition: node.targetPosition,
              hidden: node.hidden,
              width: node.width,
              height: node.height,
            };

            // Include transaction data for fingerprintNode
            if (node.type === 'fingerprintNode' && node.data.transaction) {
              cleanNode.data.transaction = node.data.transaction;
              cleanNode.data.level = node.data.level;
              cleanNode.data.pending = node.data.pending;
            }

            if (node.selected !== undefined) cleanNode.selected = node.selected;
            if (node.positionAbsolute) cleanNode.positionAbsolute = node.positionAbsolute;
            if (node.dragging !== undefined) cleanNode.dragging = node.dragging;

            return cleanNode;
          });

        // Filter edges (only include edges where both source and target are in filteredNodes)
        const filteredNodeIds = new Set(filteredNodes.map((n: any) => n.id));
        const filteredEdges = edges
          .filter((edge: any) =>
            filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
          )
          .map((edge: any) => {
            const cleanEdge: any = {
              id: edge.id,
              source: edge.source,
              target: edge.target,
            };

            if (edge.sourceHandle) cleanEdge.sourceHandle = edge.sourceHandle;
            if (edge.targetHandle) cleanEdge.targetHandle = edge.targetHandle;
            if (edge.style) cleanEdge.style = edge.style;
            if (edge.animated !== undefined) cleanEdge.animated = edge.animated;

            return cleanEdge;
          });

        // Save level to database
        const response = await apiFetch(`/level/${levelNum}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: `Level ${levelNum}`,
            description: `Animation level ${levelNum}`,
            nodes: filteredNodes,
            edges: filteredEdges,
            templateName: templateName
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || `Failed to save level ${levelNum}`);
        }
      }

      toast.success(`All levels saved successfully to template "${templateName}"!`);
      return true;
    } catch (err) {
      console.error('Error saving levels:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save levels');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    // Data
    templates,
    loading,
    error,

    // Operations
    fetchTemplates,
    cloneTemplate,
    saveAllLevels,

    // Utilities
    refetch: fetchTemplates
  };
};
