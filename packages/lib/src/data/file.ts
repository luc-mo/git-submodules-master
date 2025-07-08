import axios from 'axios'

export const main = async() => {
  const data = await axios.get('https://jsonplaceholder.typicode.com/todos/1')
  console.log({ data })
}