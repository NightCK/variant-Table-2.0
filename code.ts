const selection = figma.currentPage.selection[0]

if (selection) {
	VariantTable()
} else {
	figma.closePlugin('Please select a component')
}

async function VariantTable() {
	// TODO: 一建立 font 系統就預設用 Inter，就算要用別的 font 也是得先讀取 Inter 再改過去自己想要的...
	// 所以就索性先用 Inter，應該有正確的方式
	await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
	await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })

	if (selection) {
		var anchorProperty: string = ''
		const selectionX = selection.x
		const selectionY = selection.y
		const selectionWidth = selection.width
		const variantList: string[] = []
		const booleanList: string[] = []
		let booleanCombination: object[] = []
		let newSelection = [] as SceneNode[]

		switch (selection.type) {
			case 'COMPONENT_SET':
				const componentList = selection.findChildren(
					(node) => node.type === 'COMPONENT'
				) as ComponentNode[]

				sortProperties(selection)
				booleanCombination = generateBooleanProperties(booleanList)

				// 建立主要容器的 Frame
				const containerFrame: FrameNode = figma.createFrame()
				containerFrame.name = `${selection.name} - Variant Table`
				containerFrame.layoutMode = 'VERTICAL'
				containerFrame.layoutSizingVertical = 'HUG'
				containerFrame.layoutSizingHorizontal = 'HUG'
				containerFrame.verticalPadding = 48
				containerFrame.horizontalPadding = 48
				containerFrame.itemSpacing = 24
				containerFrame.x = selectionX + selectionWidth + 24
				containerFrame.y = selectionY
				containerFrame.cornerRadius = 12
				containerFrame.fills = []

				if (variantList.length > 0) {
					anchorProperty = variantList[0]
					console.log('variantList', anchorProperty)

					selection.componentPropertyDefinitions[anchorProperty].variantOptions?.forEach(
						(anchorOption) => {
							const regex = new RegExp(`${anchorProperty}=${anchorOption}`, 'ig')
							const variantGroup: ComponentNode[] = componentList.filter((variant) =>
								variant.name.match(regex)
							)

							// 建立各群組的 Frame
							const groupFrame: FrameNode = figma.createFrame()
							groupFrame.name = `${anchorProperty}:${anchorOption}`
							groupFrame.layoutMode = 'HORIZONTAL'
							groupFrame.layoutSizingVertical = 'HUG'
							groupFrame.layoutSizingHorizontal = 'HUG'
							groupFrame.paddingTop = 40
							groupFrame.paddingBottom = 40
							groupFrame.paddingLeft = 40
							groupFrame.paddingRight = 40
							groupFrame.itemSpacing = 16
							groupFrame.cornerRadius = 12
							groupFrame.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]

							const frameIndexOption: FrameNode = figma.createFrame()
							frameIndexOption.name = 'Variant Title'
							frameIndexOption.layoutMode = 'VERTICAL'
							frameIndexOption.layoutSizingVertical = 'HUG'
							frameIndexOption.layoutSizingHorizontal = 'FIXED'
							frameIndexOption.itemSpacing = 4
							frameIndexOption.resize(160, frameIndexOption.height)
							frameIndexOption.fills = []
							groupFrame.appendChild(frameIndexOption)

							const textIndexVariant: TextNode = figma.createText()
							textIndexVariant.characters = anchorProperty
							textIndexVariant.fontName = { family: 'Inter', style: 'Bold' }
							textIndexVariant.fontSize = 12
							textIndexVariant.textCase = 'TITLE'
							textIndexVariant.fills = [
								{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } },
							]
							frameIndexOption.appendChild(textIndexVariant)
							textIndexVariant.layoutSizingHorizontal = 'FILL'

							const textIndexOption: TextNode = figma.createText()
							textIndexOption.characters = anchorOption
							textIndexOption.fontName = { family: 'Inter', style: 'Bold' }
							textIndexOption.fontSize = 32
							textIndexOption.textCase = 'TITLE'
							frameIndexOption.appendChild(textIndexOption)
							textIndexOption.layoutSizingHorizontal = 'FILL'

							const instanceGroup: FrameNode = createVariant(
								anchorOption,
								variantGroup,
								booleanCombination
							)

							groupFrame.appendChild(instanceGroup)
							containerFrame.appendChild(groupFrame)
						}
					)
				} else {
					// TODO: 處理只有 boolean 的情況
					anchorProperty = booleanList[0]
					console.log('booleanList', anchorProperty)
				}

				newSelection.push(containerFrame)
				figma.currentPage.selection = newSelection
				figma.viewport.scrollAndZoomIntoView(newSelection)
				figma.closePlugin('Done')
				break
			case 'COMPONENT':
				figma.closePlugin('Select a component set please 🙏🏻')
				break
			default:
				figma.closePlugin('Select a component set please 🙏🏻')
		}

		function sortProperties(node: ComponentNode | ComponentSetNode) {
			// Sort property type
			for (const [property, value] of Object.entries(node.componentPropertyDefinitions)) {
				if (value.type === 'BOOLEAN') {
					booleanList.push(property)
				}
				if (value.type === 'VARIANT') {
					variantList.push(property)
				}
			}
			return
		}

		function generateBooleanProperties(booleanList: string[]) {
			let booleanResult: object[] = []
			let allTrueProperty: object = {}
			let allFalseProperty: object = {}

			// Intialize all true scenario object
			booleanList.forEach((boolean) => {
				allTrueProperty = {
					...allTrueProperty,
					[boolean]: true,
				}
			})
			booleanResult.push(allTrueProperty)

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
						booleanResult.push(setToTrueProperty)
					}
				}
			})

			booleanResult.push(allFalseProperty)
			return booleanResult
		}

		function createVariant(
			indexOption: string,
			variantGroup: ComponentNode[],
			booleanCombination?: object[]
		) {
			const container: FrameNode = figma.createFrame()
			container.name = `${indexOption}`
			container.layoutMode = 'HORIZONTAL'
			container.layoutSizingVertical = 'HUG'
			container.layoutSizingHorizontal = 'HUG'
			container.paddingTop = 20
			container.paddingBottom = 20
			container.paddingLeft = 20
			container.paddingRight = 20
			container.itemSpacing = 48
			container.fills = []

			variantGroup.map((variant) => {
				const variantContainer: FrameNode = figma.createFrame()
				variantContainer.name = variant.name
				variantContainer.layoutMode = 'VERTICAL'
				variantContainer.layoutSizingVertical = 'HUG'
				variantContainer.layoutSizingHorizontal = 'HUG'
				variantContainer.itemSpacing = 16
				variantContainer.fills = []
				container.appendChild(variantContainer)

				const variantTitle: TextNode = figma.createText()
				variantTitle.characters = variant.name
				variantTitle.fontName = { family: 'Inter', style: 'Bold' }
				variantTitle.fontSize = 16
				variantTitle.textCase = 'TITLE'
				variantTitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]

				variantContainer.appendChild(variantTitle)

				const variantCollection: FrameNode = figma.createFrame()
				variantCollection.name = 'Variants'
				variantCollection.layoutMode = 'VERTICAL'
				variantCollection.layoutSizingVertical = 'HUG'
				variantCollection.layoutSizingHorizontal = 'HUG'
				variantCollection.itemSpacing = 16
				variantCollection.fills = []
				variantContainer.appendChild(variantCollection)

				if (booleanCombination) {
					for (const combination of booleanCombination) {
						const newInstance = variant.createInstance()
						newInstance.setProperties({ ...combination })
						variantCollection.appendChild(newInstance)
					}
				} else {
					const newInstance = variant.createInstance()
					variantCollection.appendChild(newInstance)
				}
			})
			return container
		}
	}
}
