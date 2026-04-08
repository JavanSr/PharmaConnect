import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, AlertTriangle, Thermometer, Snowflake, Wind } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/types';

const STORAGE_ICON: Record<string, React.ReactNode> = {
  AMBIENT: <Wind size={13} className="text-[#64748B]" />,
  REFRIGERATED: <Thermometer size={13} className="text-[#1A6B5C]" />,
  FROZEN: <Snowflake size={13} className="text-[#6D28D9]" />,
};

const STORAGE_LABEL: Record<string, string> = {
  AMBIENT: 'Ambient',
  REFRIGERATED: 'Refrigerated',
  FROZEN: 'Frozen',
};

type ProductsListRowProps = {
  product: Product;
  onOpenProduct: (productId: string) => void;
};

const ProductsListRow = React.memo(function ProductsListRow({
  product,
  onOpenProduct,
}: ProductsListRowProps) {
  const stock = product.currentStock ?? 0;
  const isLow = stock <= product.reorderLevel;
  const isOut = stock === 0;

  return (
    <tr
      className="hover:bg-[#EDF7F3] cursor-pointer"
      onClick={() => onOpenProduct(product.id)}
    >
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-[#0D4035]">{product.genericName || product.name}</p>
        {product.brandName && <p className="text-xs text-[#64748B]">{product.brandName}</p>}
      </td>

      <td className="px-4 py-3">
        {product.sku && <p className="text-xs font-mono text-[#0D4035]">{product.sku}</p>}
        {product.barcode && <p className="text-xs font-mono text-[#64748B]">{product.barcode}</p>}
        {!product.sku && !product.barcode && <span className="text-xs text-[#D6F0E8]">-</span>}
      </td>

      <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">
        {product.dosageForm && <span>{product.dosageForm}</span>}
        {product.strength && <span className="ml-1 font-medium text-[#0D4035]">{product.strength}</span>}
      </td>

      <td className="px-4 py-3 text-sm text-[#0D4035] whitespace-nowrap">
        {product.sellingPrice != null
          ? `TZS ${Number(product.sellingPrice).toLocaleString()}`
          : <span className="text-[#D6F0E8]">-</span>}
      </td>

      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${isOut ? 'text-[#DC2626]' : isLow ? 'text-[#D97706]' : 'text-[#0D4035]'}`}>
          {stock.toLocaleString()}
        </span>
        <span className="text-xs text-[#64748B] ml-1">{product.unitOfMeasure}</span>
      </td>

      <td className="px-4 py-3 text-sm text-[#64748B]">{product.reorderLevel}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {STORAGE_ICON[product.storageCondition] ?? null}
          <span className="text-xs text-[#64748B]">
            {STORAGE_LABEL[product.storageCondition] ?? product.storageCondition}
          </span>
          {product.isColdChain && (
            <span className="text-xs px-1.5 py-0.5 bg-[#EDE9FE] text-[#6D28D9] rounded-full font-medium">CC</span>
          )}
        </div>
      </td>

      <td className="px-4 py-3 text-xs font-mono text-[#64748B]">
        {product.tmdaRegistrationNumber || <span className="text-[#D6F0E8]">-</span>}
      </td>

      <td className="px-4 py-3">
        <Badge
          variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}
          size="sm"
        >
          {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
        </Badge>
      </td>
    </tr>
  );
});

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, lowStockOnly],
    queryFn: () => api.get('/inventory/products', {
      params: { search: debouncedSearch || undefined, lowStock: lowStockOnly || undefined, limit: 50 },
    }).then(r => r.data),
  });

  const products: Product[] = data?.data || [];

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleLowStockToggle = useCallback(() => {
    setLowStockOnly(value => !value);
  }, []);

  const handleOpenProduct = useCallback((productId: string) => {
    navigate(`/inventory/products/${productId}/edit`);
  }, [navigate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#0D4035]">Products</h1>
        <Link to="/inventory/products/new">
          <Button leftIcon={<Plus size={16} />}>Add Product</Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by name, generic name, barcode, SKU..."
            value={search}
            onChange={handleSearchChange}
            leftIcon={<Search size={16} />}
            className="flex-1"
          />
          <button
            onClick={handleLowStockToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              lowStockOnly
                ? 'bg-amber-50 text-[#D97706] border-amber-200'
                : 'bg-white text-[#64748B] border-[#D6F0E8] hover:bg-[#EDF7F3]'
            }`}
          >
            <AlertTriangle size={15} />
            Low Stock Only
          </button>
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#D6F0E8]">
                  {[
                    'Generic / Brand Name',
                    'SKU / Barcode',
                    'Form & Strength',
                    'Selling Price',
                    'Stock',
                    'Reorder',
                    'Storage',
                    'TMDA Reg.',
                    'Status',
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6F0E8]">
                {products.map(product => (
                  <ProductsListRow
                    key={product.id}
                    product={product}
                    onOpenProduct={handleOpenProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
