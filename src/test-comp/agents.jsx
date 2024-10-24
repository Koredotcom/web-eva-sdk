import React, { useEffect, useState } from 'react'
import AllAgents from '../agents/AllAgents'
import EnabledAgents from '../agents/EnabledAgents'
import recentAgents from '../agents/RecentAgents'
import InitiateChatConversationAction from '../chat/InitiateChatConversationAction'
import { InvokeAgent } from '../chat'

const Agents = () => {
    const [agents, setAgents] = useState(null)

    useEffect(() => {
        fetchRecentAgentsData()
        fetchEnabledAgentsData()
        fetchAllAgentsData()
    }, [])

    const fetchRecentAgentsData = async () => {
        const res = await recentAgents()
        console.log(res)
        setAgents(res)
    }
    const fetchEnabledAgentsData = async () => {
        const res = await EnabledAgents()
        console.log(res)
    }
    const fetchAllAgentsData = async () => {
        const res = await AllAgents()
        console.log(res)
    }

    const agentHandler = (agent) => {
        const payload = {
            intent: "welcome",
            question: "How can the \"Summarizer\" agent assist me",
            source: agent?.id
        }
        InitiateChatConversationAction({ payload })
    }
    return (
        <div>
            <h1>Agents</h1>
            <ul>
                {agents && agents.data.map(agent => {
                    return (
                        <li key={agent.id} onClick={() => InvokeAgent(agent)}>{agent.name}</li>
                    )
                })}
            </ul>
        </div>
    )
}

export default Agents