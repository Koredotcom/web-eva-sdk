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
<<<<<<< HEAD
  
  // Initialize MultiIntentExecution instance
  const { runTask, cancelTask, restartExecution, fetchHistoricalTask } = MultiIntentExecution();
  
  
=======

  // Initialize MultiIntentExecution instance
  const { runTask, cancelTask, restartExecution, fetchHistoricalTask } = MultiIntentExecution();


>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
  // Get questions from Redux store and keep them synced with store updates
  const [questions, setQuestions] = useState(() => store.getState().global.questions);

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
<<<<<<< HEAD
          <button 
            className="startBtn" 
=======
          <button
            className="startBtn"
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
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
<<<<<<< HEAD
        
=======

>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
        // Render each task through TemplateRenderer (like original logic)
        const taskHtml = TemplateRenderer.generateHTMLTemplate(mergedTask, {
          loadingText: "Analyzing",
        });

        // Regular task item
        return (
          <React.Fragment key={task?._id || `task-${items?.id}-${index}`}>
            <div className='addNewLineWrapper'>
            </div>
            <div className="taskItem">
              <div className="taskItemHeader">
                <div className="taskItemHeaderTitle">Task {index + 1}</div>
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
                  <div className="utterance">{task?.utterance}</div>
                </div>
                {(mergedTask?.status === "completed" || mergedTask?.status === "discard" || mergedTask?.status === "terminated") && (
<<<<<<< HEAD
                  <button 
=======
                  <button
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
                    className="chevronBtn"
                    onClick={() => toggleTaskExpansion(mergedTask)}
                    aria-label="Toggle task details"
                  >
<<<<<<< HEAD
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12 10l-4-4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
=======
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M12 10l-4-4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
                  </button>
                )}
                {mergedTask?.loading && (
                  <>
<<<<<<< HEAD
                  <div className="loadingState"><div class="loading-text">Analyzing</div></div>
                  <button 
                    className="skipBtn" 
                    onClick={() => cancelTask(mergedTask)}
                  >
                    Skip this step
                  </button>
=======
                    <div className="loadingState"><div class="loading-text">Analyzing</div></div>
                    <button
                      className="skipBtn"
                      onClick={() => cancelTask(mergedTask)}
                    >
                      Skip this step
                    </button>
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
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
<<<<<<< HEAD
                      <button 
                        className="skipBtn" 
=======
                      <button
                        className="skipBtn"
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
                        onClick={() => cancelTask(mergedTask)}
                      >
                        Skip this step
                      </button>
                    )}
                  </>
                )}
                {mergedTask?.showResponse && taskHtml && (
<<<<<<< HEAD
                  <div 
=======
                  <div
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
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
<<<<<<< HEAD

=======
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
