const itemRepository = require('../repositories/itemRepository');

class ItemService {
  getItems(search, includeInactive = false) {
    return itemRepository.findAll(search, includeInactive);
  }

  getItemById(id) {
    return itemRepository.findById(id);
  }

  saveItem(data) {
    if (!data.code || !data.name) {
      throw new Error('Item Code and Name are required fields.');
    }
    return itemRepository.saveItem(data);
  }

  deleteItem(id) {
    if (!id) {
      throw new Error('Item ID is required for deletion.');
    }
    return itemRepository.deleteItem(id);
  }

  deactivateItem(id) {
    if (!id) {
      throw new Error('Item ID is required.');
    }
    return itemRepository.deactivateItem(id);
  }
}

module.exports = new ItemService();
