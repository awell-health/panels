import { Loader2, Search } from 'lucide-react'
import { type FC, useState, useEffect, type ChangeEvent } from 'react'
import { useDebounce } from './utils'

interface Props {
  searchQuery: string
  setSearchQuery: (value: string) => void
  children?: React.ReactNode
}

const SearchInput: FC<Props> = ({ searchQuery, setSearchQuery, children }) => {
  const [inputValue, setInputValue] = useState(searchQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [isActiveInput, setIsActiveInput] = useState(false)
  const debouncedInputValue = useDebounce(inputValue, 200)

  // Update search query only when debounced value length is > 2 or equals 0
  useEffect(() => {
    if (debouncedInputValue.length > 2 || debouncedInputValue.length === 0) {
      setSearchQuery(debouncedInputValue)
    }
    setIsSearching(false)
  }, [debouncedInputValue, setSearchQuery])

  const handleSearchQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSearching(true)
    setInputValue(e.target.value)
  }

  return (
    <div className="relative mb-4">
      <label
        className={`flex items-center gap-2 border rounded-md  w-full text-sm py-2 px-4 group ${
          isActiveInput ? 'border-blue-500' : 'border-gray-200'
        }`}
      >
        {!isSearching && <Search className="text-gray-400 w-4 h-4" />}
        {isSearching && (
          <Loader2 className="text-gray-400 animate-spin w-4 h-4" />
        )}
        <input
          name="search-input"
          id="search-input"
          type="search"
          required
          placeholder="Search context..."
          value={inputValue}
          onChange={handleSearchQueryChange}
          className="outline-none focus:outline-none flex-1"
          onFocus={() => setIsActiveInput(true)}
          onBlur={() => setIsActiveInput(false)}
        />
      </label>
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-gray-500">
          Type at least 3 characters to search
        </div>
        {children && children}
      </div>
    </div>
  )
}

export default SearchInput
