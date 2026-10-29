export type CategorySlug = 'beaute' | 'cosmetiques' | 'lessive' | 'nettoyage'

export interface Variant {
  id: number
  label: string
  sku: string
  price: number
  compare_at_price: number | null
  stock: number
}

export interface ProductSummary {
  id: number
  slug: string
  name: string
  category: CategorySlug
  category_label: string
  short_description: string
  image_url: string
  is_new: boolean
  is_bestseller: boolean
  price: number
  compare_at_price: number | null
  discount_percent: number | null
  in_stock: boolean
  variants: Variant[]
}

export interface ProductDetail extends ProductSummary {
  reference: string
  description: string
  usage: string
  composition: string
  precautions: string
}

export interface CategoryFacet {
  value: CategorySlug
  label: string
  count: number
}

export interface ProductPage {
  items: ProductSummary[]
  total: number
  page: number
  pages: number
  facets: CategoryFacet[]
}

export interface User {
  id: number
  email: string | null
  phone: string | null
  first_name: string
  last_name: string
  loyalty_points: number
  address_zone: string
  address_line: string
  address_landmark: string
  is_staff: boolean
}

export interface SessionPayload {
  access: string
  access_expires_at: number
  user: User
}

export type ShippingMethod = 'delivery_dakar' | 'pickup'
export type PaymentMethod = 'wave' | 'orange_money' | 'card' | 'cash_on_delivery'

export interface CartLineInput {
  variant_id: number
  quantity: number
}

export interface QuoteLine {
  variant_id: number
  product_name: string
  product_slug: string
  category: CategorySlug
  variant_label: string
  unit_price: number
  quantity: number
  line_total: number
  available: number
}

export interface Quote {
  lines: QuoteLine[]
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  promo_code: string | null
  loyalty_points: number
}

export interface OrderItem {
  product_name: string
  product_slug: string
  variant_label: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface Order {
  number: string
  created_at: string
  status: 'preparing' | 'shipping' | 'delivered' | 'picked_up' | 'cancelled'
  status_label: string
  payment_method: PaymentMethod
  payment_method_label: string
  payment_status: 'pending' | 'paid' | 'on_delivery' | 'failed'
  payment_status_label: string
  shipping_method: ShippingMethod
  shipping_method_label: string
  first_name: string
  last_name: string
  phone: string
  email: string
  address_zone: string
  address_line: string
  address_landmark: string
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  promo_code: string
  loyalty_points_earned: number
  items: OrderItem[]
}

export interface CreatedOrder extends Order {
  access_key: string
}

export interface StoreConfig {
  delivery_fee_dakar: number
  delivery_zones: string[]
  fcfa_per_loyalty_point: number
  announcements: string[]
  ga4_measurement_id: string
  clarity_project_id: string
}
