import { internalLibFunction, externalLibFunction } from '@lib'
import { axiosCall } from '@sub-lib'
import { internalMasterFunction } from '@/function'

const main = async() => {
  const internalLibCall = internalLibFunction()
  console.log({ internalLibCall })

  const externalLibCall = await externalLibFunction()
  console.log({ externalLibCall })

  const subLibAxiosCall = await axiosCall()
  console.log({ subLibAxiosCall })

  const internalMasterCall = internalMasterFunction()
  console.log({ internalMasterCall })
}

main()