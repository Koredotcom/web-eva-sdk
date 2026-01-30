import React, { useState, useEffect } from 'react';
import './../../templateRenderer/styles/template.scss';
import { TemplateRenderer } from '../../templateRenderer';
import store from '../../redux/store';
import { MultiIntentExecution } from '../../chat';


// THIS FILE IS BEING MADE TO TEST THE MULTI INTENT EXECUTION WITHIN THE SCOPE OF MORGAN STANLEY DELIVERABLES.
//  SO, FEW FEATURES ARENT PRESENT IN THIS DEMO COMPONENT. 
const MultiIntentExecutionDemo = ({ data }) => {
  const items = data || {};
  const initialState = items?.status === "draft";
  
  // Initialize MultiIntentExecution instance
  const {
    runTask,
    cancelTask,
    restartExecution,
    fetchHistoricalTask,
    addNewTask,
    saveTask,
    deleteNewTask,
    deleteExistingTask,
    editTask,
  } = MultiIntentExecution();
  
  
  // Get questions from Redux store and keep them synced with store updates
  const [questions, setQuestions] = useState(() => store.getState().global.questions);
  
  // State to track which task is being hovered
  const [hoveredTaskIndex, setHoveredTaskIndex] = useState(null);

  // Subscribe to Redux store changes to update questions reactively
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newQuestions = store.getState().global.questions;
      setQuestions(newQuestions);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Toggle task expansion
  const toggleTaskExpansion = (mergedTask) => {
    fetchHistoricalTask(items, mergedTask);
  };

  return (
    <div className={`multiIntentExecution ${items?.status} ${items?.executionPipeline?.length === 0 ? 'd-none' : ''}`}>
      <div id={`answer-${items?.id}`} className="threadName maxLength">
        {items?.templateInfo?.label}
      </div>

      {items?.status === 'draft' && items?.executionPipeline?.length > 0 && (
        <>
          <button 
            className="startBtn" 
            onClick={() => runTask(items)}
          >
            {items?.templateInfo?.action}
          </button>
        </>
      )}

      {/* Body - Execution Pipeline */}
      {items?.executionPipeline?.map((task, index) => {
        // Merge task with question data from Redux store (like original logic)
        const mergedTask = { ...task, ...questions?.[task?._id], isTask: true };
        const taskType = mergedTask?.type || task?.type;
        
        // Render each task through TemplateRenderer (like original logic)
        const taskHtml = mergedTask?.templateType
          ? TemplateRenderer.generateHTMLTemplate(mergedTask, {
              loadingText: "Analyzing",
            })
          : null;

        if (taskType === "addTask" || taskType === "modify") {
          return (
            <div className="addingNewTask" key={task?._id || `task-${items?.id}-${index}`}>
              <div className="headerSec">
                {taskType === "addTask" && (
                  <div className="headerMsg">? {mergedTask?.headerMsg}</div>
                )}
                <div className="headerInfo">
                  <div className="step">{mergedTask?.step || `Step ${index + 1}`}</div>
                </div>
                <div className="addDescription">
                  <input
                    type="text"
                    defaultValue={mergedTask?.utterance || ""}
                    placeholder="Add the description of step(s) which I missed!"
                    id={`utterance-${items?.id}-${index}`}
                  />
                </div>
                <div className="footerSec">
                  <div className="btns">
                    <button
                      className="cancelBtn"
                      onClick={() => deleteNewTask(items, task, index)}
                    >
                      Cancel
                    </button>
                    <button
                      className="doneBtn"
                      onClick={async () => {
                        const utteranceInput = document.getElementById(
                          `utterance-${items?.id}-${index}`
                        );
                        const nextUtterance = utteranceInput?.value || "";
                        await saveTask(
                          index,
                          mergedTask,
                          items?.executionPipeline,
                          items,
                          nextUtterance
                        );
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Regular task item
        return (
          <React.Fragment key={task?._id || `task-${items?.id}-${index}`}>
            <div className='addNewLineWrapper'>
            </div>
            <div 
              className="taskItem"
              onMouseEnter={() => setHoveredTaskIndex(index)}
              onMouseLeave={() => setHoveredTaskIndex(null)}
            >
              <div className="taskItemHeader">
                <div className="taskItemHeaderTitle">
                  Task {index + 1}
                  {hoveredTaskIndex === index && initialState && (
                    <div className="taskActionButtons">
                      <button
                        className="addTaskBtn"
                        onClick={() => addNewTask(index + 1, task, items)}
                        aria-label="Add new task"
                        title="Add new task after this step"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        className="editTaskBtn"
                        onClick={() => editTask(index, task, items)}
                        aria-label="Edit task"
                        title="Edit this task"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 4l2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        className="deleteTaskBtn"
                        onClick={() => deleteExistingTask(index, task, items)}
                        aria-label="Delete task"
                        title="Delete this task"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4h8v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="contentBlock">
                  {Array.isArray(task?.intents) && task.intents.length > 0 && (
                    <div className="agentIcons">
                      {task.intents.slice(0, 2).map((intent, idx) => (
                        <div className="agentIcon" key={idx}>
                          <img src={intent?.agentMeta?.icon} alt={`Agent ${idx + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="utterance" id={`utterance-${items?.id}-${index}`}>{task?.utterance}</div>
                </div>
                {(mergedTask?.status === "completed" || mergedTask?.status === "discard" || mergedTask?.status === "terminated") && (
                  <button 
                    className="chevronBtn"
                    onClick={() => toggleTaskExpansion(mergedTask)}
                    aria-label="Toggle task details"
                  >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12 10l-4-4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                  </button>
                )}
                {mergedTask?.loading && (
                  <>
                  <div className="loadingState"><div class="loading-text">Analyzing</div></div>
                  <button 
                    className="skipBtn" 
                    onClick={() => cancelTask(mergedTask)}
                  >
                    Skip this step
                  </button>
                  </>
                )}
                {mergedTask?.error && (
                  <>
                    <button
                      className="restartBtn"
                      onClick={() => restartExecution(items)}
                    >
                      Restart Execution
                    </button>
                    {!mergedTask?.skipped && (
                      <button 
                        className="skipBtn" 
                        onClick={() => cancelTask(mergedTask)}
                      >
                        Skip this step
                      </button>
                    )}
                  </>
                )}
                {mergedTask?.showResponse && taskHtml && (
                  <div 
                    className="bottomCard"
                    dangerouslySetInnerHTML={{ __html: taskHtml?.innerHTML }}
                  />
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MultiIntentExecutionDemo;

