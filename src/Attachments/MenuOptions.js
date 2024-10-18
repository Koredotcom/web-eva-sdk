import FileUpload from "./fileUpload";

const MenuOptions = (item) => {
    const askFollowUpButton = document.getElementById('followupButton');
    askFollowUpButton.addEventListener('click', (e) => FileUpload().setChipAsSource(item))
}

export default MenuOptions;