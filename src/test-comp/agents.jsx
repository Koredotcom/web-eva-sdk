import React, { useEffect, useState } from 'react'
import AllAgents from '../agents/AllAgents'
import EnabledAgents from '../agents/EnabledAgents'
import recentAgents from '../agents/RecentAgents'
import InitiateChatConversationAction from '../chat/InitiateChatConversationAction'
import { ChatInterface, InvokeAgent } from '../chat'
import CommonAgents from '../agents/CommonAgents'
import { bookmarkAgent } from '../agents/actionsOnAgents'
import pinnedAgents from '../agents/pinnedAgents'

const Agents = () => {
    const [agents, setAgents] = useState(null)
    const [commonAgents, setCommonAgents] = useState(null)
    const [pinnedAgentsList, setPinnedAgentsList] = useState(null)

    useEffect(() => {
        fetchRecentAgentsData()
        fetchEnabledAgentsData()
        fetchAllAgentsData()
        fetchCommonAgentsData()
        fetchPinnedAgentsData()
    }, [])

    const fetchPinnedAgentsData = async () => {
        const res = await pinnedAgents()
        setPinnedAgentsList(res)
    }

    const fetchRecentAgentsData = async () => {
        const res = await recentAgents()
        // console.log(res)
        setAgents(res)
    }
    const fetchEnabledAgentsData = async () => {
        const res = await EnabledAgents()
        // console.log(res)
    }
    const fetchAllAgentsData = async () => {
        const res = await AllAgents()
        // console.log(res)
    }
    const fetchCommonAgentsData = async () => {
        const res = await CommonAgents()
        setCommonAgents(res?.data)
        // console.log(res)
    }

    const bookmarkAgentHandler = async (agentId, value) => {
        const res = await bookmarkAgent(agentId, value)
        if(res) {
            setPinnedAgentsList(res)
        }
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
                {agents && agents.data.map((agent, index) => {
                    return (
                        <div key={index}>
                            <li key={agent.id} onClick={() => InvokeAgent(agent)}>{agent.name}</li>
                            {pinnedAgentsList?.includes(agent.id) ? <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: false})}>Unbookmark</button> : <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: true})}>Bookmark</button>}
                        </div>                        
                    )
                })}
            </ul>
            <h1>Common Agents</h1>
            <ul>
                {commonAgents?.length > 0 && commonAgents?.map((agent, index) => {
                    return (
                        <div key={index}>
                            <li key={agent.id} onClick={() => ChatInterface().setAgentContext(agent)}>{agent.name}</li>
                            {pinnedAgentsList?.includes(agent.id) ? <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: false})}>Unbookmark</button> : <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: true})}>Bookmark</button>}
                        </div>
                        
                    )
                })}
            </ul>
        </div>
    )
}

export default Agents