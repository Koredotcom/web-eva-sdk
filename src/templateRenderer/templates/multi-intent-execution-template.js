import { cloneDeep } from "lodash";
import store from "../../redux/store";
import { multiIntentExecutionFunc } from "../functionality/multi-intent-execution";
import TemplateRenderer from "../templateRenderer";
import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function render(data) {

    let state = store?.getState()?.global;
    let _questions = cloneDeep(state?.questions);
    let items = data || {};

    let initialState = items?.status === "draft"

    let header = `
        <div id="answer-${items?.id}" class="threadName maxLength" >
            ${items?.templateInfo?.label}
        </div>

        ${items?.status === 'draft' && items?.executionPipeline?.length > 0 ? `
            <button class="startBtn" id = "startBtn-${items?.id}">${items?.templateInfo?.action}</button>
            <button class="editBtn" id = "editBtn-${items?.id}">Edit</button>
        ` : ''}
        `;

    let body = `
        ${items?.executionPipeline?.map((task, index) => {
            task = {...task, ..._questions[task?._id]};
            let html = TemplateRenderer.generateHTMLTemplate(task);
            return `
                <div className='addNewLineWrapper'>
                  <div className='addNewLine'>
                      <span className='stepIcon'> ------------------------------------- + </span>
                  </div>
                </div>
                <div class="taskItem">
                    <div class="taskItemHeader">
                        <div class="taskItemHeaderTitle">Task ${index + 1}</div>
                        <div class="utterance">${task?.utterance}</div>
                        ${task?.showResponse ? `
                            <div class="bottomCard">
                            ${html?.innerHTML}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('')}
    `;

    
    let multiIntentExecution = `
        <div class="multiIntentExecution ${items?.status} ${items?.executionPipeline?.length === 0 ? 'd-none' : ''}">
            ${header}
            ${body}
        </div>
    `;

    // multiIntentExecution += header;


    let timeout 
    clearTimeout(timeout)
    timeout = setTimeout(() => {
        multiIntentExecutionFunc(data);
    }, 1000);

    return multiIntentExecution;
}


export { render };
