import { cloneDeep } from "lodash";
import { updateChatData } from "../../redux/globalSlice";
import store from "../../redux/store";
import { formatToDDMMYY } from "../../utils/helpers";

const htmlTableRenderer = (data) => {
    let {
        columnData, // columns
        rowData, // rows
        cso, // cso
        id, // id
        showAllData // showAllData
    } = data;

    let initial = true;
    let showSeeMoreButton = false;

    const seeMoreHandler = () => {
        initial = false;
        let seeMoreButton = document.getElementById(`see-more-button-${id}`);
        if(seeMoreButton && !seeMoreButton.eventListenerAdded){
            seeMoreButton.addEventListener('click', () => {
                let state = store.getState().global;
                let _questions = cloneDeep(state.questions);
                _questions[id].showAllData = true;
                store.dispatch(updateChatData(_questions));
                seeMoreButton.remove();
            });
            seeMoreButton.eventListenerAdded = true;
        }
    }

    if(showAllData){
        initial = false;
    }

    if(initial){
        rowData?.length > 5 ? showSeeMoreButton = true : null;
        rowData = rowData?.slice(0, 5);
    }

    const getCellValue = (row, col) => {
        let cellValue = row[col?.id] || '';
        if(col?.cSchema?.type === "date"){
            cellValue = formatToDDMMYY(cellValue);
        }else if(col?.cSchema?.type === "json"){
            cellValue = `${cellValue?.icon ? `<img src="${cellValue?.icon}" alt="Image" style="width: 20px; height: 20px;" />` : ''}${cellValue?.text}`;
        }else if(col?.cSchema?.type === "string"){
            if(col?.type === 'url'){
                cellValue = cellValue?.split(',')?.[0];
            }else{
                cellValue = cellValue;
            }
        }
        return cellValue;
    }

    const getCellWidth = (col) => {
        let reqdColumn = cso?.find(c => c?.cId === col?.id);
        let cellWidth = reqdColumn?.width < 50 ? 50 : reqdColumn?.width || 150;
        return cellWidth;
    }
    
    let tableHTML = `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse; width:100%; table-layout:fixed;">`;

    // Header row
    tableHTML += `<thead><tr>`;
    columnData?.forEach(col => {
      tableHTML += `<th style="width:${getCellWidth(col)}px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${col?.name}</th>`;
    });
    tableHTML += `</tr></thead>`;
    
    // Data rows
    tableHTML += `<tbody>`;
    rowData?.forEach((row, index) => {
      tableHTML += `<tr>`;
      columnData?.forEach(col => {
        tableHTML += `<td id="cell-${col?.id}-${index}" style="max-height:50px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${getCellValue(row, col)}</td>`;
      });
      tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;
    
    if(showSeeMoreButton){
        let seeMoreButton = `<button class="see-more-button" id = 'see-more-button-${id}'>See More</button>`
        tableHTML += seeMoreButton;
    }

    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        seeMoreHandler();
    }, 1000);

    return tableHTML;
}

export default htmlTableRenderer;
