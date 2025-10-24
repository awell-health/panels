import type { Column, Filter, Sort } from '@/types/panel'
import type { Bundle, BundleEntry, Resource } from '@medplum/fhirtypes'
import { create } from 'zustand'
import { filteredAndSortedData } from './client-table'

export type FHIRStore = {
  bundles: BundleEntry[]
  filters: Filter[]
  sort: { columnId: string; direction: 'asc' | 'desc' } | null
  columns: Column[]
  filteredAndSortedBundles: BundleEntry[]
  crossColumnSearchTerm: string
  setBundles: (b: BundleEntry[]) => void
  updateBundle: (id: string, bundle: BundleEntry) => void
  updateResourceInBundle: (resource: Resource) => void
  getBundleByResourceId: (
    resourceType: string,
    id: string,
  ) => BundleEntry | undefined
  setFilters: (f: Filter[]) => void
  setSort: (s: { columnId: string; direction: 'asc' | 'desc' } | null) => void
  setColumns: (c: Column[]) => void
  setCrossColumnSearchTerm: (term: string) => void
  getDataResourceTypes: () => string[]
  _recomputeFilteredData: () => void
}

export const useFHIRStore = create<FHIRStore>((set, get) => ({
  bundles: [],
  filters: [],
  sort: null,
  columns: [],
  filteredAndSortedBundles: [],
  crossColumnSearchTerm: '',
  setBundles: (bundles) => {
    set({ bundles })
    get()._recomputeFilteredData()
  },
  updateBundle: (id, newBundle) => {
    set((state) => ({
      bundles: state.bundles.map((b) =>
        b.resource?.id === id ? newBundle : b,
      ),
    }))
    get()._recomputeFilteredData()
  },
  updateResourceInBundle: (resource) => {
    if (!resource?.id || !resource?.resourceType) {
      return
    }
    set((state) => ({
      bundles: state.bundles.map((b) => {
        // If the bundle entry contains a Bundle resource, try to update nested entries
        if (b.resource?.resourceType === 'Bundle') {
          const bundle = b.resource as Bundle
          const updatedEntry = bundle.entry?.map((e) =>
            e.resource?.id === resource.id &&
            e.resource?.resourceType === resource.resourceType
              ? { ...e, resource }
              : e,
          )

          if (updatedEntry && updatedEntry !== bundle.entry) {
            return { ...b, resource: { ...bundle, entry: updatedEntry } }
          }
          return b
        }

        return b
      }),
    }))
    get()._recomputeFilteredData()
  },
  getBundleByResourceId: (resourceType: string, id: string) => {
    const state = get()
    for (const bundleEntry of state.bundles) {
      if (bundleEntry.resource?.resourceType !== 'Bundle') continue
      const bundle = bundleEntry.resource as Bundle
      const hasMatch = (bundle.entry || []).some(
        (e) =>
          e.resource?.resourceType === resourceType && e.resource?.id === id,
      )
      if (hasMatch) return bundleEntry
    }
    return undefined
  },
  setFilters: (filters) => {
    set({ filters })
    get()._recomputeFilteredData()
  },
  setSort: (sort) => {
    set({ sort })
    get()._recomputeFilteredData()
  },
  setColumns: (columns: Column[]) => {
    set({ columns })
  },
  setCrossColumnSearchTerm: (term: string) => {
    set({ crossColumnSearchTerm: term })
    get()._recomputeFilteredData()
  },
  _recomputeFilteredData: () => {
    const state = get()

    const filteredData = filteredAndSortedData(
      state.bundles,
      state.filters || [],
      state.sort as Sort,
      state.columns,
      state.crossColumnSearchTerm,
    )

    set({ filteredAndSortedBundles: filteredData })
  },
  getDataResourceTypes: () => {
    const bundles = get().bundles
    if (bundles.length === 0) return []

    const resourceTypes = new Set<string>()
    const bundle = bundles[0].resource as Bundle

    if (bundle?.entry) {
      for (const entry of bundle.entry) {
        resourceTypes.add(entry.resource?.resourceType || '')
      }
    }
    return Array.from(resourceTypes)
  },
}))

// Selector hooks for better performance
export const useFilteredAndSortedBundles = () =>
  useFHIRStore((state) => state.filteredAndSortedBundles)

export const useFHIRFilters = () => useFHIRStore((state) => state.filters)

export const useFHIRSort = () => useFHIRStore((state) => state.sort)

export const useCrossColumnSearchTerm = () =>
  useFHIRStore((state) => state.crossColumnSearchTerm)

// Selector to subscribe to a specific bundle by contained resource id/type
export const useBundleByResourceId = (resourceType: string, id: string) =>
  useFHIRStore((state) => {
    for (const bundleEntry of state.bundles) {
      if (bundleEntry.resource?.resourceType !== 'Bundle') continue
      const bundle = bundleEntry.resource as Bundle
      const hasMatch = (bundle.entry || []).some(
        (e) =>
          e.resource?.resourceType === resourceType && e.resource?.id === id,
      )
      if (hasMatch) return bundleEntry
    }
    return undefined
  })
