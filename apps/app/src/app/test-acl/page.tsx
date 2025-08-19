import { ACLTestComponent } from '@/components/ACLTestComponent'
import PageNavigation from '../../components/PageNavigation'

export default function TestACLPage() {
  return (
    <PageNavigation
      title="Test ACL"
      description="Test ACL"
      breadcrumb={[{ label: 'Test ACL' }]}
    >
      <ACLTestComponent />
    </PageNavigation>
  )
}
