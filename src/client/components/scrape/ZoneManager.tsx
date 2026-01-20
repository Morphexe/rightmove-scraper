import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Check, MapPin, Loader2 } from 'lucide-react';
import { apiClient } from '@client/api/client';
import { toast } from 'sonner';
import { cn } from '@client/lib/utils';

interface Location {
  name: string;
  postcode: string;
  radius: number;
}

export function ZoneManager() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Location>({ name: '', postcode: '', radius: 5 });
  
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['config-locations'],
    queryFn: async () => {
      const res = await apiClient.config.locations.list();
      return (res.data as Location[]) || [];
    }
  });
  
  const addMutation = useMutation({
    mutationFn: (loc: Location) => apiClient.config.locations.add(loc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-locations'] });
      toast.success('Zone added');
      setIsAdding(false);
      setFormData({ name: '', postcode: '', radius: 5 });
    },
    onError: (err) => toast.error(`Failed: ${err.message}`)
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ index, loc }: { index: number; loc: Location }) => 
      apiClient.config.locations.update(index, loc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-locations'] });
      toast.success('Zone updated');
      setEditingIndex(null);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`)
  });
  
  const deleteMutation = useMutation({
    mutationFn: (index: number) => apiClient.config.locations.delete(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-locations'] });
      toast.success('Zone deleted');
    },
    onError: (err) => toast.error(`Failed: ${err.message}`)
  });
  
  const handleSubmitAdd = () => {
    if (!formData.name || !formData.postcode) {
      toast.error('Name and postcode are required');
      return;
    }
    addMutation.mutate(formData);
  };
  
  const handleSubmitEdit = (index: number) => {
    if (!formData.name || !formData.postcode) {
      toast.error('Name and postcode are required');
      return;
    }
    updateMutation.mutate({ index, loc: formData });
  };
  
  const startEdit = (index: number, loc: Location) => {
    setEditingIndex(index);
    setFormData(loc);
  };
  
  const cancelEdit = () => {
    setEditingIndex(null);
    setFormData({ name: '', postcode: '', radius: 5 });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the areas to search for properties
        </p>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Zone
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {isAdding && (
          <div className="card border-primary/50 bg-primary/5">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Zone name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 input"
              />
              <input
                type="text"
                placeholder="Postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })}
                className="w-28 input"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                  className="w-16 input text-center"
                />
                <span className="text-sm text-muted-foreground">mi</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleSubmitAdd}
                  disabled={addMutation.isPending}
                  className="p-2 rounded-lg bg-success text-success-foreground hover:bg-success/90"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setIsAdding(false); setFormData({ name: '', postcode: '', radius: 5 }); }}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {locations.map((loc, index) => (
          <div key={index} className="card">
            {editingIndex === index ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 input"
                />
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })}
                  className="w-28 input"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                    className="w-16 input text-center"
                  />
                  <span className="text-sm text-muted-foreground">mi</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSubmitEdit(index)}
                    disabled={updateMutation.isPending}
                    className="p-2 rounded-lg bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={cancelEdit} className="p-2 rounded-lg bg-muted hover:bg-muted/80">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {loc.postcode} • {loc.radius} mile radius
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(index, loc)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${loc.name}"?`)) {
                        deleteMutation.mutate(index);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {locations.length === 0 && !isAdding && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No search zones configured</p>
            <p className="text-sm">Add a zone to start scraping properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
