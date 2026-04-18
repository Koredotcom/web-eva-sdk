import React, { useEffect, useState } from 'react'
import AllAgents from '../agents/AllAgents'
import EnabledAgents from '../agents/EnabledAgents'
import recentAgents from '../agents/RecentAgents'
import InitiateChatConversationAction from '../chat/InitiateChatConversationAction'
import { ChatInterface, InvokeAgent } from '../chat'
import CommonAgents from '../agents/CommonAgents'
import { agentEnablementUserLevel, bookmarkAgent } from '../agents/actionsOnAgents'
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

    const agentEnablementUserLevelHandler = async (agentId, value) => {
        const res = await agentEnablementUserLevel(agentId, value)
        if(res?.success) {
            console.log('agentEnablementUserLevelHandler', res)
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
                            {agent.enabled ? <button onClick={() => agentEnablementUserLevelHandler(agent.id, {enable: false})}>Disable</button> : <button onClick={() => agentEnablementUserLevelHandler(agent.id, {enable: true})}>Enable</button>}
                        </div>                        
                    )
                })}
            </ul>
            <h1>Common Agents</h1>
            <ul>
                {commonAgents?.length > 0 && commonAgents?.map((agent, index) => {
                    const llmModels = agent?.id === 'llm' ? (agent?.runtime?.config?.models || []) : []
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <li key={agent.id} onClick={() => 
                                ChatInterface().setAgentContext(agent)
                                }>{agent.name}</li>

                            {agent?.id === 'llm' && llmModels.length > 0 && (
                                <select
                                    defaultValue=""
                                    onChange={(e) => {
                                        const selectedId = e.target.value
                                        if (!selectedId) return
                                        ChatInterface().setAgentContext(agent)
                                        ChatInterface().storeUserSelectedLLMModel(selectedId)
                                    }}
                                >
                                    <option value="" disabled>Select a model</option>
                                    {llmModels.map((m, i) => (
                                        <option key={m?.model?.id || i} value={m?.model?.id}>
                                            {m?.name || m?.model?.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {pinnedAgentsList?.includes(agent.id) ? <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: false})}>Unbookmark</button> : <button onClick={() => bookmarkAgentHandler(agent.id, {pinned: true})}>Bookmark</button>}
                        </div>
                        
                    )
                })}
            </ul>
        </div>
    )
}

export default Agents