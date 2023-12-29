// TODO
// 1. Ignore selected property
// 2. User can choose which property as group

const selection = figma.currentPage.selection[0]

if (selection) {
	VariantTable()
} else {
	figma.closePlugin('Please select a component')
}

async function VariantTable() {
	await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
	await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })

	const selectionX = selection.x
	const selectionY = selection.y
	const selectionWidth = selection.width // 用 x 有可能會跟 selection 重疊，因此改抓 width
	let newSelection = [] as SceneNode[]
	const containerFrame: FrameNode = figma.createFrame()

	switch (selection.type) {
		case 'COMPONENT_SET':
			// Sort variant type to differant array
			const booleanArray: string[] = []
			const variantArray: object[] = []
			for (const [property, value] of Object.entries(
				selection.componentPropertyDefinitions
			)) {
				switch (value.type) {
					case 'VARIANT':
						const variant: object = {
							[property]: value.variantOptions,
						}
						variantArray.push(variant)
						break
					case 'BOOLEAN':
						booleanArray.push(property)
						break
				}
			}
			const booleanCombination = generateBooleanCombination(booleanArray)
			const variantProperties = generateVariantProperties(
				variantArray,
				[],
				booleanCombination
			)

			createVariant(variantProperties, containerFrame)

			// 建立主要容器的 Frame
			containerFrame.name = selection.name
			containerFrame.layoutMode = 'HORIZONTAL'
			containerFrame.layoutSizingVertical = 'HUG'
			containerFrame.layoutSizingHorizontal = 'HUG'
			containerFrame.itemSpacing = 0
			containerFrame.x = selectionX + selectionWidth + 24
			containerFrame.y = selectionY
			newSelection.push(containerFrame)
			figma.viewport.scrollAndZoomIntoView(newSelection)

			figma.closePlugin('Done')
			break
		case 'COMPONENT':
			// Handle componentNode
			break
		default:
			figma.closePlugin('Select a component please')
			break
	}

	function generateVariantProperties(
		variantArray: object[],
		propertiesArray: object[],
		booleanCombination?: object[]
	) {
		if (variantArray.length === 0) return propertiesArray

		const currentVariant = variantArray.pop() as object
		const propertyName: string = Object.keys(currentVariant).toString()
		const variantOption: string[] = Object.values(currentVariant)[0] // 不知道為何還有多包一層，因此加上 [0]
		let newPropertiesArray: object[] = [] // 之前應該是沒給到這個暫存空間，才導致產出的 object 的 option 一直被覆蓋掉。

		if (propertiesArray.length === 0) {
			for (const option of variantOption) {
				if (booleanCombination) {
					for (const bool of booleanCombination) {
						const newProperties: object = {
							[propertyName]: option,
							...bool,
						}
						propertiesArray.push(newProperties)
					}
				} else {
					const newProperties: object = {
						[propertyName]: option,
					}
					propertiesArray.push(newProperties)
				}
			}
			return generateVariantProperties(variantArray, propertiesArray)
		} else {
			variantOption.map((option) => {
				propertiesArray.map((properties) => {
					const newProperties = {
						[propertyName]: option,
						...properties,
					}

					newPropertiesArray.push(newProperties)
				})
			})
			return generateVariantProperties(variantArray, newPropertiesArray)
		}
	}

	function generateBooleanCombination(booleanList: string[]) {
		let booleanCombination: object[] = []
		let allTrueProperty: object = {}
		let allFalseProperty: object = {}

		// Intialize all true scenario object
		booleanList.forEach((boolean) => {
			allTrueProperty = {
				...allTrueProperty,
				[boolean]: true,
			}
		})
		booleanCombination.push(allTrueProperty)

		// Intialize all false scenario object,
		// but push this array in the end of the function, to make sure the order is correct
		booleanList.forEach((boolean) => {
			allFalseProperty = {
				...allFalseProperty,
				[boolean]: false,
			}
		})

		// Generate all kinds of boolean scenarios
		booleanList.forEach((anchor) => {
			// Note the location of the anchor
			const index = booleanList.indexOf(anchor)
			// use slice() to create a new array
			const arraySlice = booleanList.slice(index)
			// Resemble the array, the index item become the first item in this new array
			for (let i = 0; i < index; i++) {
				arraySlice.push(booleanList[i])
			}
			let setToTrueProperty = allTrueProperty

			for (const bool of arraySlice) {
				if (bool !== anchor) {
					setToTrueProperty = {
						...setToTrueProperty,
						[bool]: false,
					}
					booleanCombination.push(setToTrueProperty)
				}
			}
		})

		booleanCombination.push(allFalseProperty)
		return booleanCombination
	}

	function createVariant(variantProperties: object[], targetContainer: FrameNode) {
		if (variantProperties.length === 0) return

		// TODO 讓使用者從 UI 選擇要怎麼排序。應該只要替換掉 selectedIndex 就可以
		let properties: object[] = Object.values(variantProperties)
		let groupSelection: object[] = []
		const selectedIndex = 0
		const indexVariant = properties.shift() as Object
		const indexProperty: string = Object.keys(indexVariant)[selectedIndex] // 例如：State
		const indexValue: string = Object.values(indexVariant)[selectedIndex] // 例如：Active

		for (const variant of Object.values(properties)) {
			const property: string = Object.keys(variant)[selectedIndex]
			const value: string = Object.values(variant)[selectedIndex]

			if (property === indexProperty && value === indexValue) {
				// 找出一樣的值，例如符合 State:Active，就會被 push 倒 groupSelection
				groupSelection.push(variant)
				// 接著用 filter() 把已經 push 過的 variant 移除
				properties = properties.filter((property) => property !== variant)
			}
		}

		// 建立各群組的 Frame
		const groupFrame: FrameNode = figma.createFrame()
		groupFrame.name = `${indexProperty}:${indexValue}`
		groupFrame.layoutMode = 'VERTICAL'
		groupFrame.layoutSizingVertical = 'HUG'
		groupFrame.layoutSizingHorizontal = 'HUG'
		groupFrame.maxWidth = 800
		groupFrame.paddingTop = 20
		groupFrame.paddingBottom = 20
		groupFrame.paddingLeft = 20
		groupFrame.paddingRight = 20
		groupFrame.itemSpacing = 16

		const groupTitle: TextNode = figma.createText()
		groupTitle.characters = indexValue
		groupTitle.fontName = { family: 'Inter', style: 'Bold' }
		groupTitle.fontSize = 32
		groupTitle.textCase = 'TITLE'
		groupFrame.appendChild(groupTitle)

		// 利用 groupSelection 建立 InstanceNode
		groupSelection.map((variant: object) => {
			// Create InstanceNode
			const selectedNode = selection as ComponentSetNode
			const instance = selectedNode.defaultVariant.createInstance()
			instance.setProperties({ ...variant })
			groupFrame.appendChild(instance)
		})

		// 將 groupFrame 放入 containerFrame
		containerFrame.appendChild(groupFrame)
		return createVariant(properties, containerFrame)
	}
}
