import { GardenForm } from '@/components/admin/GardenForm'

export default function NewGardenPage() {
  // 今日の日付をデフォルト値に設定
  const today = new Date().toISOString().slice(0, 10)
  return (
    <GardenForm
      isNew
      initialData={{
        date: today,
        slug: today,
        title: today.replace(/-/g, '.'),
      }}
    />
  )
}
