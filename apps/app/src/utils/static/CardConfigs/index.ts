import defaultCards from './defaultCards'
import encompassCards from './Encompass/encompassCards'
import wellpathCards from './Wellpath/wellpathCards'
import waypointCards from './Waypoint/waypointCards'

export const cardConfigs = {
  wellpath: [...wellpathCards],
  'encompass-health': [...encompassCards],
  waypoint: [...waypointCards],
  'awell-dev': [...defaultCards],
  default: [...defaultCards],
}

export const getCardConfigs = (organizationSlug: string) => {
  return (
    cardConfigs[organizationSlug as keyof typeof cardConfigs] ?? [
      ...defaultCards,
    ]
  )
}
