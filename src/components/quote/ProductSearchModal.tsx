import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Plus, Package, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HubSpotProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  cost: number;
  productType: string;
  originalType?: string;
  hasOverride?: boolean;
  dealer?: string;
}

interface PricingTier {
  id: string;
  name: string;
  prices: Array<{ product_model: string; rep_cost: number }>;
}

interface ProductSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalId: string;
  selectedTier: string;
  pricingTiers: PricingTier[];
  onAddProduct: (product: HubSpotProduct, tierCost?: number) => void;
}

const PRODUCT_TYPES = ['Hardware', 'Accessory', 'Service', 'Software'];

export function ProductSearchModal({
  open,
  onOpenChange,
  portalId,
  selectedTier,
  pricingTiers,
  onAddProduct,
}: ProductSearchModalProps) {
  const [search, setSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [dealerFilter, setDealerFilter] = useState<string>('');
  const [dealerOptions, setDealerOptions] = useState<string[]>([]);
  const [products, setProducts] = useState<HubSpotProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [reclassifying, setReclassifying] = useState<string | null>(null);

  const tier = pricingTiers.find(t => t.name === selectedTier);

  const fetchProducts = useCallback(async (searchQuery: string, typeFilter: string, cursor?: string | null, dealer?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-get-products', {
        body: {
          portalId,
          search: searchQuery || undefined,
          productType: typeFilter || undefined,
          dealerFilter: dealer || undefined,
          after: cursor || undefined,
        },
      });

      if (error) {
        console.error('Failed to fetch products:', error);
        return;
      }

      if (cursor) {
        setProducts(prev => [...prev, ...(data.products || [])]);
      } else {
        setProducts(data.products || []);
      }
      setHasMore(data.hasMore || false);
      setAfterCursor(data.after || null);
      // Always accumulate dealer options from responses
      if (data.dealerValues?.length > 0) {
        setDealerOptions(prev => {
          const merged = new Set([...prev, ...data.dealerValues]);
          return [...merged].sort();
        });
      }
    } catch (err) {
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setProductTypeFilter('');
      setDealerFilter('');
      setProducts([]);
      fetchProducts('', '');
    }
  }, [open, fetchProducts]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setAfterCursor(null);
      fetchProducts(value, productTypeFilter, null, dealerFilter);
    }, 400);
    setSearchTimeout(timeout);
  };

  const handleTypeFilterChange = (type: string) => {
    const newType = type === productTypeFilter ? '' : type;
    setProductTypeFilter(newType);
    setAfterCursor(null);
    fetchProducts(search, newType, null, dealerFilter);
  };

  const handleDealerFilterChange = (dealer: string) => {
    const newDealer = dealer === 'all' ? '' : dealer;
    setDealerFilter(newDealer);
    setAfterCursor(null);
    fetchProducts(search, productTypeFilter, null, newDealer);
  };

  const handleLoadMore = () => {
    if (afterCursor) {
      fetchProducts(search, productTypeFilter, afterCursor, dealerFilter);
    }
  };

  const handleReclassify = async (product: HubSpotProduct, newType: string) => {
    setReclassifying(product.id);
    try {
      const { error } = await supabase.functions.invoke('product-type-override-save', {
        body: { portalId, hsProductId: product.id, productType: newType },
      });
      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, productType: newType, hasOverride: true }
          : p
      ));
      toast.success(`Reclassified "${product.name}" as ${newType}`);
    } catch (err) {
      console.error('Reclassify error:', err);
      toast.error('Failed to reclassify product');
    } finally {
      setReclassifying(null);
    }
  };

  const filteredProducts = (() => {
    if (!tier || !selectedTier || selectedTier === 'Standard') {
      return products;
    }
    const tierSkus = new Set(tier.prices.map(p => p.product_model.toLowerCase()));
    return products.filter(p => tierSkus.has(p.sku.toLowerCase()) || tierSkus.has(p.name.toLowerCase()));
  })();

  const getTierCost = (product: HubSpotProduct): number | undefined => {
    if (!tier || !selectedTier || selectedTier === 'Standard') return undefined;
    const match = tier.prices.find(
      p => p.product_model.toLowerCase() === product.sku.toLowerCase() ||
           p.product_model.toLowerCase() === product.name.toLowerCase()
    );
    return match?.rep_cost;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Product from Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs text-muted-foreground">Filter:</span>
            {PRODUCT_TYPES.map(type => (
              <Badge
                key={type}
                variant={productTypeFilter === type ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => handleTypeFilterChange(type)}
              >
                {type}
              </Badge>
            ))}
            {dealerOptions.length > 0 && (
              <Select value={dealerFilter || 'all'} onValueChange={handleDealerFilterChange}>
                <SelectTrigger className="h-7 text-xs w-44 ml-2">
                  <SelectValue placeholder="All Pricing Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricing Sources</SelectItem>
                  {dealerOptions.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedTier && selectedTier !== 'Standard' && (
              <Badge variant="secondary" className="text-xs ml-auto">
                Tier: {selectedTier}
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1">
              {filteredProducts.map(product => {
                const tierCost = getTierCost(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate max-w-[280px]">{product.name}</span>
                        <Badge
                          variant={product.hasOverride ? 'default' : 'outline'}
                          className="text-[10px] shrink-0"
                        >
                          {product.productType || 'Unclassified'}
                        </Badge>
                        {product.hasOverride && (
                          <span className="text-[10px] text-muted-foreground">(overridden)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.dealer && <span className="text-blue-600">Source: {product.dealer}</span>}
                        <span>MSRP: ${(product.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        {tierCost !== undefined ? (
                          <span className="text-primary font-medium">
                            Tier Cost: ${tierCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span>Cost: ${(product.cost ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Select
                        value={product.productType || ''}
                        onValueChange={(val) => handleReclassify(product, val)}
                        disabled={reclassifying === product.id}
                      >
                        <SelectTrigger className="h-7 w-7 p-0 border-none [&>svg]:hidden" title="Reclassify product type">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(type => (
                            <SelectItem key={type} value={type} className="text-xs">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddProduct(product, tierCost)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {selectedTier && selectedTier !== 'Standard'
                    ? `No products found in the "${selectedTier}" pricing tier.`
                    : 'No products found. Try a different search.'}
                </div>
              )}

              {hasMore && !loading && (
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" onClick={handleLoadMore}>
                    Load more products
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
