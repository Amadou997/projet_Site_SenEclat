import type { CategorySlug, Order } from '../../lib/types'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

export interface AdminVariant {
  id?: number
  label: string
  sku: string
  price: number
  compare_at_price: number | null
  stock: number
}

export interface AdminProduct {
  id: number
  slug: string
  name: string
  category: CategorySlug
  category_label: string
  reference: string
  short_description: string
  description: string
  usage: string
  composition: string
  precautions: string
  image_url: string
  is_new: boolean
  is_bestseller: boolean
  is_active: boolean
  sales_count: number
  created_at: string
  updated_at: string
  variants: AdminVariant[]
}

export type AdminProductInput = Omit<AdminProduct, 'id' | 'category_label' | 'sales_count' | 'created_at' | 'updated_at' | 'image_url'>

export interface AdminOrder extends Order {
  id: number
  customer_id: number | null
  updated_at: string
}

export interface AdminCustomer {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  loyalty_points: number
  address_zone: string
  address_line: string
  address_landmark: string
  is_active: boolean
  is_staff: boolean
  date_joined: string
  last_login: string | null
  orders_count: number
  total_spent: number
  last_order_at: string | null
}

export interface PromoCode {
  id: number
  code: string
  percent_off: number
  min_subtotal: number
  is_active: boolean
}

export interface ContactMessage {
  id: number
  full_name: string
  phone: string
  subject: string
  subject_label: string
  message: string
  is_handled: boolean
  created_at: string
}

export interface SiteSettings {
  delivery_fee_dakar: number
  delivery_zones: string[]
  fcfa_per_loyalty_point: number
  announcements: string[]
  ga4_measurement_id: string
  clarity_project_id: string
  updated_at: string
}

export interface AdminStats {
  revenue_total: number
  orders_total: number
  revenue_30d: number
  orders_30d: number
  average_basket: number
  orders_to_process: number
  orders_shipping: number
  customers_total: number
  customers_30d: number
  products_active: number
  products_total: number
  messages_unhandled: number
  low_stock: { product_id: number; product_name: string; variant_label: string; sku: string; stock: number }[]
  top_products: { id: number; name: string; sales_count: number }[]
  recent_orders: AdminOrder[]
}

export const ORDER_STATUSES: { value: Order['status']; label: string }[] = [
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipping', label: 'En cours de livraison' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'picked_up', label: 'Retirée en boutique' },
  { value: 'cancelled', label: 'Annulée' },
]

export const PAYMENT_STATUSES: { value: Order['payment_status']; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Validé' },
  { value: 'on_delivery', label: 'À la livraison' },
  { value: 'failed', label: 'Échoué' },
]
