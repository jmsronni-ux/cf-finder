import React from 'react';

interface DataVisualProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
  onClose: () => void;
  onAddChildNode?: (parentNodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  canDelete?: boolean;
  isAdmin?: boolean;
}

const DataVisual: React.FC<DataVisualProps> = ({ 
  selectedNode, 
  onUpdateNodeData, 
  onClose, 
  onAddChildNode,
  onDeleteNode,
  canDelete = false,
  isAdmin = false
}) => {
  if (!selectedNode) return null;
  
  const isFingerprintNode = selectedNode.type === 'fingerprintNode';
  const isCryptoNode = selectedNode.type === 'cryptoNode';

  return (
    <div className="absolute top-20 w-[30rem] right-6 z-30 bg-gray-800/90 border border-gray-600 rounded-lg p-4 max-w-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
      <h3 className="text-white font-semibold mb-3">{isAdmin ? 'Edit' : 'View'} Node: {selectedNode.data.label}</h3>
      
      {/* Basic Node Information - Admin Only */}
      <div className="space-y-3 text-sm">
        {isAdmin && (
          <>
            <div>
              <label className="block text-gray-300 mb-1">Node ID:</label>
              <input
                type="text"
                value={selectedNode.id}
                disabled
                className="w-full bg-gray-700 text-gray-400 px-2 py-1 rounded text-xs"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1">Node Type:</label>
              <input
                type="text"
                value={selectedNode.type}
                disabled
                className="w-full bg-gray-700 text-gray-400 px-2 py-1 rounded text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Label:</label>
              <input
                type="text"
                value={selectedNode.data.label || ''}
                onChange={(e) => {
                  const newData = {
                    label: e.target.value
                  };
                  onUpdateNodeData(selectedNode.id, newData);
                }}
                className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Only show level and pending for fingerprint nodes */}
            {isFingerprintNode && (
              <>
                <div>
                  <label className="block text-gray-300 mb-1">Level:</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={selectedNode.data.level || 1}
                    onChange={(e) => {
                      const newData = {
                        level: parseInt(e.target.value) || 1
                      };
                      onUpdateNodeData(selectedNode.id, newData);
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Pending:</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedNode.data.pending || 0}
                    onChange={(e) => {
                      const newData = {
                        pending: parseInt(e.target.value) || 0
                      };
                      onUpdateNodeData(selectedNode.id, newData);
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Crypto node specific info */}
            {isCryptoNode && (
              <div className="mt-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded">
                <div className="text-blue-300 text-xs font-medium mb-1">
                  💡 Crypto Node
                </div>
                <div className="text-gray-300 text-xs">
                  Click "Add Child Transaction Node" below to create a new transaction node connected to this {selectedNode.data.label} node.
                </div>
              </div>
            )}
          </>
        )}

        {/* Transaction Details for Fingerprint Nodes */}
        {selectedNode.data.transaction && (
          <div className="mt-4 p-3 bg-gray-700/50 rounded">
            <div className="font-medium text-white mb-3">Transaction Details:</div>
            
            <div className="space-y-2">
              <div>
                <label className="block text-gray-300 mb-1 text-xs">Transaction ID:</label>
                <input
                  type="text"
                  value={selectedNode.data.transaction.id || ''}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        id: e.target.value
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-xs">Date:</label>
                <input
                  type="date"
                  value={selectedNode.data.transaction.date || ''}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        date: e.target.value
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-xs">Amount:</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={selectedNode.data.transaction.amount || 0}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        amount: parseFloat(e.target.value) || 0
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-xs">Currency:</label>
                <select
                  value={selectedNode.data.transaction.currency || 'BTC'}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        currency: e.target.value
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                  <option value="USDT">USDT</option>
                  <option value="BNB">BNB</option>
                  <option value="TRX">TRX</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-xs">Status:</label>
                <select
                  value={selectedNode.data.transaction.status || 'Success'}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        status: e.target.value
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="Success">Success</option>
                  <option value="Pending">Pending</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-xs">Transaction Hash:</label>
                <input
                  type="text"
                  value={selectedNode.data.transaction.transaction || ''}
                  onChange={(e) => {
                    const newData = {
                      transaction: {
                        ...selectedNode.data.transaction,
                        transaction: e.target.value
                      }
                    };
                    onUpdateNodeData(selectedNode.id, newData);
                  }}
                  disabled={!isAdmin}
                  className="w-full bg-gray-600 text-white px-2 py-1 rounded text-xs border border-gray-500 focus:border-blue-500 focus:outline-none disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          {/* Allow admins to add child nodes to both crypto nodes and fingerprint nodes */}
          {isAdmin && (isFingerprintNode || isCryptoNode) && onAddChildNode && (
            <button
              onClick={() => onAddChildNode(selectedNode.id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              {isCryptoNode ? 'Add Child Transaction Node' : 'Add Child Node'}
            </button>
          )}
          
          {isAdmin && isFingerprintNode && onDeleteNode && canDelete && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Delete This Node
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataVisual;
