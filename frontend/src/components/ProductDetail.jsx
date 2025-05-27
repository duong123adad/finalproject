import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`/api/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) return <p>Đang tải chi tiết sản phẩm...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hình ảnh sản phẩm */}
        <div>
          {product.images && product.images.length > 0 ? (
            <img
              src={`/${product.images[0]}`}
              alt={product.name}
              className="rounded-lg w-full h-auto object-cover"
            />
          ) : (
            <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
              <span>Không có hình ảnh</span>
            </div>
          )}
          <div className="flex mt-4 gap-2">
            {product.images?.slice(1).map((img, i) => (
              <img
                key={i}
                src={`/${img}`}
                alt={`Ảnh ${i}`}
                className="w-20 h-20 object-cover rounded-md border"
              />
            ))}
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div>
          <p className="mb-2">
            <span className="font-semibold">Mô tả:</span> {product.description || "Không có mô tả"}
          </p>
          <p className="mb-2">
            <span className="font-semibold">Giá bán:</span> {product.price} đ
          </p>
          <p className="mb-2">
            <span className="font-semibold">SKU:</span> {product.SKU}
          </p>
          <p className="mb-2">
            <span className="font-semibold">Đơn vị:</span> {product.unit}
          </p>
          <p className="mb-2">
            <span className="font-semibold">Danh mục:</span> {product.category?.name}
          </p>

          {/* Nhà cung cấp */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Nhà cung cấp</h3>
            {product.suppliers?.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {product.suppliers.map((s, idx) => (
                  <li key={idx}>
                    {s.supplier.name || "Không rõ nhà cung cấp"}
                    {s.supplier.contact?.phone && ` - ${s.supplier.contact.phone}`}
                    {s.isPrimary && " (Nhà cung cấp chính)"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Không có nhà cung cấp</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
