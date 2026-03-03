import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Plus, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface HubSpotProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  cost: number;
  productType: string;
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
  const [products, setProducts] = useState<HubSpotProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const tier = pricingTiers.find(t => t.name === selectedTier);

  const fetchProducts = useCallback(async (searchQuery: string, typeFilter: string, cursor?: string | null) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-get-products', {
        body: {
          portalId,
          search: searchQuery || undefined,
          productType: typeFilter || undefined,
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
    } catch (err) {
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  // Fetch on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setProductTypeFilter('');
      setProducts([]);
      fetchProducts('', '');
    }
  }, [open, fetchProducts]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setAfterCursor(null);
      fetchProducts(value, productTypeFilter);
    }, 400);
    setSearchTimeout(timeout);
  };

  const handleTypeFilterChange = (type: string) => {
    const newType = type === productTypeFilter ? '' : type;
    setProductTypeFilter(newType);
    setAfterCursor(null);
    fetchProducts(search, newType);
  };

  const handleLoadMore = () => {
    if (afterCursor) {
      fetchProducts(search, productTypeFilter, afterCursor);
    }
  };

  // Filter products by pricing tier if applicable
  const filteredProducts = (() => {
    if (!tier || !selectedTier || selectedTier === 'Standard') {
      return products;
    }
    // Only show products whose SKU matches an entry in the tier's price list
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
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Product from Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Filter:</span>
            {['Hardware', 'Accessory', 'Service'].map(type => (
              <Badge
                key={type}
                variant={productTypeFilter === type ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => handleTypeFilterChange(type)}
              >
                {type}
              </Badge>
            ))}
            {selectedTier && selectedTier !== 'Standard' && (
              <Badge variant="secondary" className="text-xs ml-auto">
                Tier: {selectedTier}
              </Badge>
            )}
          </div>

          {/* Product list */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {filteredProducts.map(product => {
                const tierCost = getTierCost(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{product.name}</span>
                        {product.productType && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {product.productType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        <span>MSRP: ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        {tierCost !== undefined ? (
                          <span className="text-primary font-medium">
                            Tier Cost: ${tierCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span>Cost: ${product.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddProduct(product, tierCost)}
                      className="shrink-0 ml-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
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
