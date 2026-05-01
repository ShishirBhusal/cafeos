'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Plus,
  X,
  Settings,
  Maximize2,
  RotateCcw,
  Coffee,
  ChefHat
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRs } from '@/lib/formatRs';

interface TableOrder {
  id: string;
  order_number: string;
  total_cents: number;
  payment_status: string;
  kitchen_status: string;
  created_at: string;
  items_count: number;
}

interface CafeTable {
  id: string;
  table_number: string;
  capacity: number;
  position_x: number;
  position_y: number;
  shape: 'round' | 'square' | 'rectangle';
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  current_order?: TableOrder | null;
}

interface TableVisualizerProps {
  cafeId: string;
  cafeName: string;
  initialTables: CafeTable[];
  floorWidth?: number;
  floorHeight?: number;
}

const TABLE_COLORS = {
  available: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  occupied: 'bg-stone-100 border-stone-300 text-stone-700',
  reserved: 'bg-blue-100 border-blue-300 text-blue-700',
  cleaning: 'bg-stone-100 border-stone-300 text-stone-500',
};

const STATUS_ICONS = {
  available: CheckCircle,
  occupied: Users,
  reserved: Clock,
  cleaning: RotateCcw,
};

export default function TableVisualizer({
  cafeId,
  cafeName,
  initialTables,
  floorWidth = 800,
  floorHeight = 600,
}: TableVisualizerProps) {
  const supabase = createClient();
  const [tables, setTables] = useState<CafeTable[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<CafeTable | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // New table form
  const [newTable, setNewTable] = useState({
    table_number: '',
    capacity: 4,
    shape: 'square' as 'round' | 'square' | 'rectangle',
  });

  // Calculate stats
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0),
    currentGuests: tables.filter(t => t.status === 'occupied').reduce((sum, t) => sum + t.capacity, 0),
    unpaidAmount: tables
      .filter(t => t.current_order?.payment_status === 'unpaid')
      .reduce((sum, t) => sum + (t.current_order?.total_cents || 0), 0),
  };

  // Real-time subscription for table updates
  useEffect(() => {
    const channel = supabase
      .channel('table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_tables', filter: `cafe_id=eq.${cafeId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTables(prev => prev.map(t => 
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeId, supabase]);

  const handleTableClick = (table: CafeTable) => {
    if (isEditing) return;
    setSelectedTable(table);
  };

  const handleStatusChange = async (tableId: string, newStatus: CafeTable['status']) => {
    try {
      const { error } = await supabase
        .from('cafe_tables')
        .update({ status: newStatus })
        .eq('id', tableId);

      if (error) throw error;

      setTables(tables.map(t => 
        t.id === tableId ? { ...t, status: newStatus } : t
      ));
      toast.success(`Table status updated`);
    } catch (error) {
      console.error('Error updating table:', error);
      toast.error('Failed to update table');
    }
  };

  const handleAddTable = async () => {
    if (!newTable.table_number.trim()) {
      toast.error('Enter table number');
      return;
    }

    try {
      // Find a good position for the new table
      const existingPositions = tables.map(t => ({ x: t.position_x, y: t.position_y }));
      let posX = 50;
      let posY = 50;
      
      // Simple grid placement
      const gridSize = 120;
      for (let y = 50; y < floorHeight - 100; y += gridSize) {
        for (let x = 50; x < floorWidth - 100; x += gridSize) {
          const occupied = existingPositions.some(p => 
            Math.abs(p.x - x) < gridSize && Math.abs(p.y - y) < gridSize
          );
          if (!occupied) {
            posX = x;
            posY = y;
            break;
          }
        }
      }

      const { data, error } = await supabase
        .from('cafe_tables')
        .insert({
          cafe_id: cafeId,
          table_number: newTable.table_number,
          capacity: newTable.capacity,
          shape: newTable.shape,
          position_x: posX,
          position_y: posY,
          status: 'available',
        })
        .select()
        .single();

      if (error) throw error;

      setTables([...tables, data]);
      setShowAddModal(false);
      setNewTable({ table_number: '', capacity: 4, shape: 'square' });
      toast.success('Table added!');
    } catch (error) {
      console.error('Error adding table:', error);
      toast.error('Failed to add table');
    }
  };

  const handleDragStart = (tableId: string) => {
    if (!isEditing) return;
    setDraggedTable(tableId);
  };

  const handleDragEnd = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedTable || !isEditing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(floorWidth - 80, (e.clientX - rect.left) / scale));
    const y = Math.max(0, Math.min(floorHeight - 80, (e.clientY - rect.top) / scale));

    try {
      const { error } = await supabase
        .from('cafe_tables')
        .update({ position_x: Math.round(x), position_y: Math.round(y) })
        .eq('id', draggedTable);

      if (error) throw error;

      setTables(tables.map(t => 
        t.id === draggedTable ? { ...t, position_x: x, position_y: y } : t
      ));
    } catch (error) {
      console.error('Error moving table:', error);
    }

    setDraggedTable(null);
  };

  const getTableSize = (table: CafeTable) => {
    const baseSize = 70;
    if (table.shape === 'rectangle') return { width: baseSize * 1.5, height: baseSize };
    return { width: baseSize, height: baseSize };
  };

  const getKitchenStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-stone-500';
      case 'preparing': return 'bg-blue-500 animate-pulse';
      case 'ready': return 'bg-emerald-500';
      default: return 'bg-stone-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-stone-900">Floor Plan</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              <CheckCircle className="w-3 h-3" /> {stats.available} free
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded-full">
              <Users className="w-3 h-3" /> {stats.occupied} occupied
            </span>
            {stats.unpaidAmount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                <AlertCircle className="w-3 h-3" /> {formatRs(stats.unpaidAmount)} unpaid
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-lg transition-colors ${
              isEditing ? 'bg-stone-100 text-stone-700' : 'hover:bg-stone-100'
            }`}
            title={isEditing ? 'Exit edit mode' : 'Edit layout'}
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 hover:bg-stone-100 rounded-lg"
            title="Add table"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floor Canvas */}
      <div 
        className="relative overflow-auto bg-stone-100"
        style={{ height: '400px' }}
        onMouseUp={handleDragEnd}
      >
        <div
          className="relative"
          style={{ 
            width: `${floorWidth}px`, 
            height: `${floorHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Tables */}
          {tables.map(table => {
            const size = getTableSize(table);
            const StatusIcon = STATUS_ICONS[table.status];
            
            return (
              <div
                key={table.id}
                className={`absolute cursor-pointer transition-all duration-200 ${
                  isEditing ? 'cursor-move hover:scale-105' : 'hover:scale-105'
                } ${draggedTable === table.id ? 'opacity-50' : ''}`}
                style={{
                  left: `${table.position_x}px`,
                  top: `${table.position_y}px`,
                  width: `${size.width}px`,
                  height: `${size.height}px`,
                }}
                onClick={() => handleTableClick(table)}
                onMouseDown={() => handleDragStart(table.id)}
              >
                <div
                  className={`w-full h-full ${
                    table.shape === 'round' ? 'rounded-full' : 'rounded-xl'
                  } border-2 ${TABLE_COLORS[table.status]} flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow`}
                >
                  <span className="font-bold text-lg">{table.table_number}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <StatusIcon className="w-3 h-3" />
                    <span>{table.capacity}</span>
                  </div>
                  
                  {/* Kitchen status indicator */}
                  {table.current_order && (
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
                      getKitchenStatusColor(table.current_order.kitchen_status)
                    } border-2 border-white`} />
                  )}
                  
                  {/* Unpaid indicator */}
                  {table.current_order?.payment_status === 'unpaid' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-stone-500 text-white text-[10px] font-bold rounded">
                      {formatRs(table.current_order.total_cents)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Coffee className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">No tables yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 px-4 py-2 bg-stone-500 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
                >
                  Add First Table
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit mode hint */}
      {isEditing && (
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 text-center text-sm text-stone-700">
          <Settings className="w-4 h-4 inline mr-1" />
          Edit mode: Drag tables to rearrange • Click <strong>Settings</strong> to exit
        </div>
      )}

      {/* Table Detail Modal */}
      {selectedTable && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${
                  selectedTable.shape === 'round' ? 'rounded-full' : 'rounded-xl'
                } ${TABLE_COLORS[selectedTable.status]} flex items-center justify-center`}>
                  <span className="font-bold text-lg">{selectedTable.table_number}</span>
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">Table {selectedTable.table_number}</h3>
                  <p className="text-sm text-stone-500">{selectedTable.capacity} seats • {selectedTable.status}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Current Order */}
              {selectedTable.current_order ? (
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-stone-500">Current Order</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedTable.current_order.payment_status === 'unpaid'
                        ? 'bg-stone-100 text-stone-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedTable.current_order.payment_status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-stone-900">
                    {formatRs(selectedTable.current_order.total_cents)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                    <ChefHat className="w-4 h-4" />
                    {selectedTable.current_order.kitchen_status}
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 rounded-xl p-4 text-center text-stone-500">
                  No active order
                </div>
              )}

              {/* Status Change */}
              <div>
                <p className="text-sm text-stone-500 mb-2">Change status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as const).map(status => {
                    const Icon = STATUS_ICONS[status];
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          handleStatusChange(selectedTable.id, status);
                          setSelectedTable({ ...selectedTable, status });
                        }}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          selectedTable.status === status
                            ? TABLE_COLORS[status] + ' ring-2 ring-offset-1 ring-stone-300'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-3 bg-stone-500 hover:bg-stone-800 text-white rounded-xl font-medium transition-colors">
                  New Order
                </button>
                {selectedTable.current_order?.payment_status === 'unpaid' && (
                  <button className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors">
                    Collect Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-stone-900">Add Table</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Table Number</label>
                <input
                  type="text"
                  value={newTable.table_number}
                  onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500"
                  placeholder="e.g., T1, A5, VIP"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Capacity</label>
                <div className="flex gap-2">
                  {[2, 4, 6, 8].map(cap => (
                    <button
                      key={cap}
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        newTable.capacity === cap
                          ? 'bg-stone-500 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Shape</label>
                <div className="flex gap-2">
                  {[
                    { value: 'round', label: '○ Round' },
                    { value: 'square', label: '□ Square' },
                    { value: 'rectangle', label: '▭ Rectangle' },
                  ].map(shape => (
                    <button
                      key={shape.value}
                      onClick={() => setNewTable({ ...newTable, shape: shape.value as any })}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
                        newTable.shape === shape.value
                          ? 'bg-stone-500 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                className="flex-1 px-4 py-3 bg-stone-500 text-white rounded-xl font-medium hover:bg-stone-800"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
