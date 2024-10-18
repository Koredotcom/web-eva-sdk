import { htmlDecode, renderIcons } from "../utils/helpers";

const AnswerFromChip = ({ item, regeneratingAnswer }) => {

    const regeneratingChipRenderer = () => {

        const threadNameDiv = document.createElement('div');
        threadNameDiv.className = 'threadName';

        const ansFromSpan = document.createElement('span');
        ansFromSpan.className = 'ansFrom';
        ansFromSpan.textContent = 'Answer from:';

        const koraSpecDrSpan = document.createElement('span');
        koraSpecDrSpan.className = 'koraSpecDr';

        const contextIconDiv = document.createElement('div');
        contextIconDiv.className = 'contextIcon';

        const krSpecNameSpan = document.createElement('span');
        krSpecNameSpan.className = 'krSpecName';
        krSpecNameSpan.innerHTML = htmlDecode(regeneratingSelectedItem?.title || "No subject");

        koraSpecDrSpan.appendChild(contextIconDiv);
        koraSpecDrSpan.appendChild(krSpecNameSpan);

        threadNameDiv.appendChild(ansFromSpan);
        threadNameDiv.appendChild(koraSpecDrSpan);

        return threadNameDiv
    }

    const tableChipRenderer = () => {
        const tableChipData = document.createElement('div');
        tableChipData.className = 'tableChipRenderer';

        const dataChip = document.createElement('span');
        dataChip.className = 'datachip';
        dataChip.textContent = item?.sources?.length > 1 ? 'Data:' : 'Answer From:'
        tableChipData.appendChild(dataChip)

        const iconDiv = document.createElement('div');
        iconDiv.className = `contextIcon ${attachment ? " attachment" : ""}`;
        let renderedIcon = renderIcons(item?.sources?.[0]?.source, item?.sources?.[0]?.extIcon, (item?.sources?.[0]?.providerIcon || item?.sources?.[0]?.icon));
        iconDiv.appendChild(renderedIcon);
        tableChipData.appendChild(iconDiv)

        let sourceName = document.createElement('span');
        sourceName.className = 'krSpecName'
        sourceName.innerHTML = htmlDecode(item?.sources?.[0]?.title || "")
        tableChipData.appendChild(sourceName);

        return tableChipData

    }

    const knowledgeChipRenderer = () => {
        const knowledgeChipRenderingBody = document.createElement('div')
        knowledgeChipRenderingBody.className = 'ansFromChip';

        if ((!!item?.data?.length || item?.hasData) && !item?.citationAnswers?.length) {
            const ansFromSpan = document.createElement('span');
            ansFromSpan.className = 'ansFrom'
            ansFromSpan.textContent = 'Data:'
            knowledgeChipRenderingBody.appendChild(ansFromSpan);
        } else {
            let ansFromChipResp = ansFromChip();
            knowledgeChipRenderingBody.appendChild(ansFromChipResp)
        }

        if (item?.sources?.length > 1 && item?.showMultiSourceList) {
            const multiSourceDiv = document.createElement('div');
            multiSourceDiv.className = 'MultiSourceListView';
            item?.sources?.map((source, i) => {
                const listviewlistitem = document.createElement('div')
                listviewlistitem.className = 'MultiSourceListViewListItem'
                listviewlistitem.key = i
                // listviewlistitem.addEventListener('click', (event) => openSource(event, source, i))

                multiSourceDiv.appendChild(listviewlistitem)
            });
        }

        if (item?.sources?.length === 1) {
            const sourceChipRenderingFunc = singleSourceChipRenderer(item?.sources?.[0])
            knowledgeChipRenderingBody.appendChild(sourceChipRenderingFunc)
        }

        return knowledgeChipRenderingBody
    }

    const ansFromChip = () => {
        if (item?.sources?.length > 1) {
            const leftblock = document.createElement('div');
            leftblock.className = 'leftWrapperBlock'

            const ansfrom = document.createElement('span');
            ansfrom.className = 'ansFrom'
            ansfrom.textContent = 'Answer From :'
            leftblock.appendChild(ansfrom)

            const koraSpecName = document.createElement('span');
            koraSpecName.className = 'krSpecName'
            koraSpecName.textContent = `${item?.sources?.length} Sources`
            leftblock.appendChild(koraSpecName)

            return leftblock

        } else {
            let ansFrom = document.createElement('span');
            ansFrom.className = 'ansFrom';
            ansFrom.textContent = 'Answer from :'
            return ansFrom
        }
    }

    const singleSourceChipRenderer = (source) => {
        let dataLoading;
        const attachment = source?.source === 'attachment';

        const singleSourceChip = document.createElement('span')
        singleSourceChip.className = `koraSpecDr${source?.warning ? ' fromWarning' : ''}${attachment ? ' attachment' : ''}`
        singleSourceChip.addEventListener('click', () => { if (attachment) return; sourceChipClickHandler() })

        if (dataLoading && Object.values(questions).find(ques => ques.id === item.id) && item.hasData) {// need to implement this when the source is loading data. 

        } else {
            const iconDiv = document.createElement('div');
            iconDiv.className = `contextIcon ${attachment ? " attachment" : ""}`;
            let renderedIcon = renderIcons(source?.source, source?.extIcon || source?.iconUrl, source?.providerIcon || source?.icon);
            iconDiv.appendChild(renderedIcon);
            singleSourceChip.appendChild(iconDiv)

            let sourceName = document.createElement('span');
            sourceName.className = 'krSpecName'
            sourceName.innerHTML = htmlDecode(source?.title || "No subject")
            singleSourceChip.appendChild(sourceName);

        }

        if (source?.warning) {
            let warningDiv = document.createElement('div');
            warningDiv.className = 'warningText';
            warningDiv.textContent = source?.warning;
            singleSourceChip.appendChild(warningDiv)
        }

        return singleSourceChip
    }

    const sourceChipClickHandler = () => {

    }

    const renderChip = () => {
        let chipElement;
        let answerFromChipDiv = document.createElement('div');
        answerFromChipDiv.className = 'answerFromChipDiv'

        if (regeneratingAnswer) {
            chipElement = regeneratingChipRenderer();
        } else if (item?.viewType === "table") {
            chipElement = tableChipRenderer();
        } else {
            chipElement = knowledgeChipRenderer();
        }

        const askFollowUpButton = document.createElement('button')
        askFollowUpButton.id = 'followupButton'
        askFollowUpButton.textContent = 'Ask Follow Up'

        answerFromChipDiv.appendChild(chipElement)
        answerFromChipDiv.appendChild(askFollowUpButton)
        return answerFromChipDiv; 
    };


    return (
        renderChip()
    )
}

export default AnswerFromChip;