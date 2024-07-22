import React, { useEffect, useState } from 'react'

const User = () => {
    const [user, setUser] = useState({})
    const [loading, setLoading] = useState(false)

    useEffect(()=> {
        setLoading(true)
        fetch('https://jsonplaceholder.typicode.com/todos/1')
            .then(response => response.json())
            .then(json => {
                setUser(json)
                setLoading(false)
            })
    }, [])

    return (
        <div>{loading ? 'Loading...' : JSON.stringify(user)}</div>
    )
}

export default User