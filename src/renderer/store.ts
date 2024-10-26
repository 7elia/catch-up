import { UserResponse } from "src/common/types";
import { reactive } from "vue";

const store = reactive({
  selectedFile: undefined as string | undefined,
  user: undefined as UserResponse | undefined
});

export default store;
