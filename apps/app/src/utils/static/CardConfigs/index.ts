import defaultCards from './defaultCards'
import encompassCards from './Encompass/encompassCards'
import wellpathCards from './Wellpath/wellpathCards'
import waypointCards from './Waypoint/waypointCards'

export const cardConfigs = {
  wellpath: [...wellpathCards],
  encompass: [...encompassCards],
  waypoint: [...waypointCards],
  awell: [...defaultCards],
  default: [...defaultCards],
}

export const getCardConfigs = (organizationSlug: string) => {
  const cardKeys = Object.keys(cardConfigs)

  for (const key of cardKeys) {
    if (organizationSlug.includes(key)) {
      const findKey = cardKeys.find((k) => organizationSlug.includes(k))

      return (
        cardConfigs[findKey as keyof typeof cardConfigs] ?? cardConfigs.default
      )
    }
  }
  return (
    cardConfigs[organizationSlug as keyof typeof cardConfigs] ?? [
      ...defaultCards,
    ]
  )
}
