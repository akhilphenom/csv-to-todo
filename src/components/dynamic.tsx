'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Upload, Search, Check, X, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const API_URL = 'http://localhost:3001/todos'

export default function Component() {
  const [data, setData] = useState([])
  const [headers, setHeaders] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCompleted, setFilterCompleted] = useState('all')
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL)
      const todos = await response.json()
      if (todos.length > 0) {
        setHeaders(Object.keys(todos[0]).filter(key => key !== 'id'))
        setData(todos)
      }
    } catch (err) {
      setError('Error fetching todos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    setError('')
    
    if (file) {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          setLoading(true)
          const text = e.target.result as string
          const rows = text.split('\n').filter(row => row.trim())
          
          const headerRow = rows[0].split(',').map(header => 
            header.trim().replace(/["']/g, '')
          )
          
          const dataRows = rows.slice(1).map(row => {
            const values = row.split(',').map(value => 
              value.trim().replace(/["']/g, '')
            )
            
            return headerRow.reduce((obj, header, idx) => {
              obj[header] = values[idx] || ''
              return obj
            }, {})
          }) as any

          await fetch(API_URL, {
            method: 'DELETE',
          })

          const addPromises = dataRows.map(row =>
            fetch(API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...row,
                completed: row.completed ? row.completed.toLowerCase() === 'true' : false
              }),
            })
          )

          await Promise.all(addPromises)
          await fetchTodos()
          
        } catch (err) {
          setError('Error processing CSV file')
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      
      reader.readAsText(file)
    }
  }

  const toggleCompleted = async (todo) => {
    try {
      setLoading(true)
      const updatedTodo = { ...todo, completed: !todo.completed }
      
      await fetch(`${API_URL}/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTodo),
      })

      setData(data.map(item => 
        item.id === todo.id ? updatedTodo : item
      ))
    } catch (err) {
      setError('Error updating todo')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const deleteTodo = async (id) => {
    try {
      setLoading(true)
      await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })
      setData(data.filter(item => item.id !== id))
    } catch (err) {
      setError('Error deleting todo')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCellValue = (value, _header) => {
    if (typeof value === 'boolean' || value?.toLowerCase?.() === 'true' || value?.toLowerCase?.() === 'false') {
      return (
        <div className={`inline-flex px-2 py-1 rounded-full text-xs ${
          value === true || value?.toLowerCase?.() === 'true'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value === true || value?.toLowerCase?.() === 'true' ? 'Yes' : 'No'}
        </div>
      )
    }

    const urlPattern = /^(https?:\/\/[^\s]+)/
    if (typeof value === 'string' && urlPattern.test(value)) {
      return (
        <a 
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          {value.substring(0, 30)}{value.length > 30 ? '...' : ''}
          <ExternalLink size={14} />
        </a>
      )
    }

    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return parseFloat(value).toLocaleString()
    }

    return value
  }

  const filteredData = useMemo(() => {
    return data
      .filter(row => {
        const matchesSearch = Object.values(row).some(value => 
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )

        const matchesCompleted = 
          filterCompleted === 'all' ? true :
          filterCompleted === 'completed' ? row.completed :
          !row.completed

        return matchesSearch && matchesCompleted
      })
  }, [data, searchTerm, filterCompleted])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  return (
    <div className="flex flex-col flex-1 basis-0 min-h-0">
      <Card className="flex-grow overflow-hidden">
        <CardHeader className="sticky top-0 z-10 bg-white border-b">
          <CardTitle className="flex items-center justify-between">
            <span>Dynamic Todo List</span>
            <div className="flex gap-4 items-center">
              {loading && (
                <Loader2 className="animate-spin" size={20} />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                  <Upload size={16} />
                  Upload CSV
                </div>
              </label>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col h-full overflow-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {data.length > 0 && (
            <div className="mb-4 flex gap-4 items-center sticky top-0 z-10 bg-white py-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterCompleted} onValueChange={setFilterCompleted}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="30">30 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Upload a CSV file to see your todos
              <div className="text-sm mt-2">
                First row should contain column headers
              </div>
            </div>
          ) : (
            <div className="overflow-auto flex-grow">
              <table className="w-full border-collapse min-w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">
                      Actions
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        row.completed ? 'bg-gray-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCompleted(row)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              row.completed
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {row.completed && <Check size={14} />}
                          </button>
                          {/* <button
                            onClick={() => deleteTodo(row.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button> */}
                        </div>
                      </td>
                      {headers.map((header, colIndex) => (
                        <td
                          key={`${row.id}-${colIndex}`}
                          className={`px-4 py-3 text-sm border-b text-gray-900 ${
                            row.completed ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          {formatCellValue(row[header], header)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredData.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm">{currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}