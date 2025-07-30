/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', '../Models/tk_commission_calculation_msr', 'N/ui/serverWidget'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, msr, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            const recordType = scriptContext.newRecord.type;
            const idRec = scriptContext.newRecord.id;
            var idSalesRep = scriptContext.newRecord.getValue('custrecord_tk_sales_rep_ls')
            var form = scriptContext.form;

            log.audit('type', scriptContext.type);

            if (recordType == 'customrecord_tk_commission_adjustment_ma') {

                if (scriptContext.type == scriptContext.UserEventType.CREATE) {

                    const sublistsToHide = [
                        "recmachcustrecord_tk_commission_query_adjustmen",
                        "recmachcustrecord_tk_commission_query_edit_link"
                    ];

                    // sublistsToHide.forEach(sublistId => {
                    //     let sublist = form.getSublist({ id: sublistId });
                    //     if (sublist) {
                    //         sublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
                    //     }
                    // });

                    form.clientScriptFileId = 36724;

                    var fieldIdsSalesRep = form.addField({
                        id: 'custpage_tk_ids_sales_rep',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'IDs SalesRep'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    var idsSalesRep = [];

                    search.create({
                        type: "employee",
                        filters: [
                            ["salesrep", "is", true]
                        ],
                        columns: [
                            search.createColumn({ name: "entityid" })
                        ]
                    }).run().each(function (result) {

                        idsSalesRep.push(result.id)

                        return true
                    })

                    fieldIdsSalesRep.defaultValue = idsSalesRep

                    form.addButton({
                        id: 'custpage_tk_search_btn',
                        label: 'Pesquisar',
                        functionName: 'executeSearch'
                    });

                    try {

                        const form = scriptContext.form;
                        addCommissionSublist(form, scriptContext);

                    } catch (error) {
                        log.error('error in setSublist', error);
                    }



                } else if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                    form.removeButton({ id: 'edit' });

                    const sublistsToHide = [
                        "recmachcustrecord_tk_commission_query_adjustmen",
                        "recmachcustrecord_tk_commission_query_edit_link"
                    ];

                    sublistsToHide.forEach(sublistId => {
                        let sublist = form.getSublist({ id: sublistId });
                        if (sublist) {
                            sublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
                        }
                    });

                    form.addTab({ id: 'custpage_commission_tab', label: 'Consulta e Ajuste de Comissão' });
                    form.addTab({ id: 'custpage_edit_values_tab', label: 'Edição de Valores' });
                    form.addTab({ id: 'custpage_tk_po_ge', label: 'Pedido de compras' });

                    function createSublist(id, label, tab, fields) {
                        let sublist = form.addSublist({
                            id,
                            type: serverWidget.SublistType.LIST,
                            label,
                            tab
                        });

                        fields.forEach(({ id, type, label, source }) => {
                            sublist.addField({ id, type, label, ...(source && { source }) });
                        });

                        let customSearch = search.create({
                            type: 'customrecord_tk_commission_management_ad',
                            filters: [
                                ['custrecord_tk_commission_query_adjustmen', 'is', idRec],
                                "AND",
                                ["custrecord_tk_doc_invoice_sl.mainline", "is", "T"],
                                "AND",
                                ["custrecord_tk_sales_representative_sl", "is", idSalesRep]
                            ],
                            columns: [
                                search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
                                'custrecord_tk_aliq_comiss',
                                'custrecord_tk_commission_query_adjustmen',
                                'custrecord_tk_sales_representative_sl',
                                'custrecord_tk_designated_representative',
                                'custrecord_tk_doc_invoice_sl',
                                'custrecord_tk_value_amount',
                                search.createColumn({
                                    name: "trandate",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Data"
                                }),
                                search.createColumn({
                                    name: "amount",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Valor"
                                }),
                                search.createColumn({
                                    name: "createdfrom",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Criar a partir de"
                                }),
                                search.createColumn({
                                    name: "type",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Tipo"
                                })
                            ]
                        });

                        let searchResult = customSearch.run().getRange({ start: 0, end: 1000 });
                        var totalValor = 0;
                        var index = 0;
                        searchResult.forEach(result => {
                            let salesRep = result.getValue('custrecord_tk_sales_representative_sl');
                            let assignedRep = result.getValue('custrecord_tk_designated_representative');
                            let fiscalDoc = result.getValue('custrecord_tk_doc_invoice_sl');
                            let fiscalDocText = result.getText('custrecord_tk_doc_invoice_sl');
                            let totalValue = result.getValue('custrecord_tk_value_amount');
                            let aliq = result.getValue('custrecord_tk_aliq_comiss');
                            let docDate = result.getValue({ name: 'trandate', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            let docAmount = result.getValue({ name: 'amount', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            let createForm = result.getValue({ name: 'createdfrom', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            let type = result.getValue({ name: 'type', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            var link = '';
                            if (type == 'VendBill') {
                                link = '<a href="https://11198682.app.netsuite.com/app/accounting/transactions/vendbill.nl?id=' + fiscalDoc + '&whence=" target="_blank">' + fiscalDocText + '</a>';
                            }

                            log.audit('salesRep', salesRep)
                            log.audit('result.id', result.id)

                            if (salesRep && assignedRep) {
                                return true
                            }

                            if (aliq)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_aliq', line: index, value: aliq });

                            if (docDate)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_date', line: index, value: docDate });
                            if (docAmount)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_value', line: index, value: docAmount.toString() });

                            if (createForm)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_transa', line: index, value: createForm });

                            if (salesRep)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_rep', line: index, value: salesRep });

                            if (link) {
                                sublist.setSublistValue({ id: 'custpage_tk_fiscal_doc', line: index, value: link });
                            } else {
                                sublist.setSublistValue({ id: 'custpage_tk_fiscal_doc', line: index, value: fiscalDocText });
                            }
                            if (totalValue)
                                sublist.setSublistValue({ id: 'custpage_tk_total_value', line: index, value: totalValue });

                            totalValor = eval(totalValor) + eval(totalValue)
                            index++
                        });

                        let customSearch2 = search.create({
                            type: 'customrecord_tk_commission_management_ad',
                            filters: [
                                ['custrecord_tk_commission_query_adjustmen', 'anyof', idRec],
                                "AND",
                                ["custrecord_tk_doc_invoice_sl", "anyof", "@NONE@"]
                            ],
                            columns: [
                                'custrecord_tk_aliq_comiss',
                                'custrecord_tk_commission_query_adjustmen',
                                'custrecord_tk_sales_representative_sl',
                                'custrecord_tk_designated_representative',
                                'custrecord_tk_doc_invoice_sl',
                                'custrecord_tk_value_amount',
                                search.createColumn({
                                    name: "trandate",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Data"
                                }),
                                search.createColumn({
                                    name: "amount",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Valor"
                                }),
                                search.createColumn({
                                    name: "createdfrom",
                                    join: "CUSTRECORD_TK_DOC_INVOICE_SL",
                                    label: "Criar a partir de"
                                })
                            ]
                        });

                        let searchResult2 = customSearch2.run().getRange({ start: 0, end: 1000 });
                        searchResult2.forEach(result => {
                            let salesRep = result.getValue('custrecord_tk_sales_representative_sl');
                            let assignedRep = result.getValue('custrecord_tk_designated_representative');
                            let fiscalDoc = result.getValue('custrecord_tk_doc_invoice_sl');
                            let totalValue = result.getValue('custrecord_tk_value_amount');
                            let aliq = result.getValue('custrecord_tk_aliq_comiss');
                            let docDate = result.getValue({ name: 'trandate', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            let docAmount = result.getValue({ name: 'amount', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });
                            let createForm = result.getValue({ name: 'createdfrom', join: 'CUSTRECORD_TK_DOC_INVOICE_SL' });

                            if (aliq)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_aliq', line: index, value: aliq });
                            if (docDate)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_date', line: index, value: docDate });

                            if (createForm)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_transa', line: index, value: createForm });

                            if (salesRep)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_rep', line: index, value: salesRep });
                            if (assignedRep)
                                sublist.setSublistValue({ id: 'custpage_tk_assigned_rep', line: index, value: assignedRep });
                            if (fiscalDoc)
                                sublist.setSublistValue({ id: 'custpage_tk_fiscal_doc', line: index, value: fiscalDoc });
                            if (totalValue)
                                sublist.setSublistValue({ id: 'custpage_tk_total_value', line: index, value: totalValue });

                            totalValor = eval(totalValor) + eval(totalValue)
                            index++
                        });
                        sublist.setSublistValue({ id: 'custpage_tk_sales_aliq', line: index, value: '<b>Total</b>' });
                        sublist.setSublistValue({ id: 'custpage_tk_total_value', line: index, value: totalValor });

                        let customSearchEditing = search.create({
                            type: 'customrecord_tk_value_editing',
                            filters: [
                                ['custrecord_tk_commission_query_edit_link', 'is', idRec]
                            ],
                            columns: [
                                'custrecord_tk_invoice_edit_ls',
                                'custrecord_tk_credit_cr',
                                'custrecord_tk_debit_cr',
                                'custrecord_tk_commission_value',
                                'custrecord_tk_final_value',
                                'custrecord_tk_rep_vendas',
                                'custrecord_tk_descri_tx'
                            ]
                        });

                        let searchResultEditing = customSearchEditing.run().getRange({ start: 0, end: 1000 });

                        var index = 0;
                        searchResultEditing.forEach(result => {
                            let fiscalDoc = result.getValue('custrecord_tk_invoice_edit_ls');
                            let credit = result.getValue('custrecord_tk_credit_cr');
                            let debit = result.getValue('custrecord_tk_debit_cr');
                            let commissionValue = result.getValue('custrecord_tk_commission_value');
                            let finalValue = result.getValue('custrecord_tk_final_value');
                            let idSalesRep = result.getValue('custrecord_tk_rep_vendas');
                            let description = result.getValue('custrecord_tk_descri_tx');

                            if (description)
                                sublist.setSublistValue({ id: 'custpage_tk_desc', line: index, value: description });
                            if (idSalesRep)
                                sublist.setSublistValue({ id: 'custpage_tk_sales_rep_edit', line: index, value: idSalesRep });
                            if (fiscalDoc)
                                sublist.setSublistValue({ id: 'custpage_tk_fiscal_doc_edit', line: index, value: fiscalDoc });
                            if (credit)
                                sublist.setSublistValue({ id: 'custpage_tk_credit', line: index, value: credit });
                            if (debit)
                                sublist.setSublistValue({ id: 'custpage_tk_debit', line: index, value: debit });
                            if (commissionValue)
                                sublist.setSublistValue({ id: 'custpage_tk_commission_value', line: index, value: commissionValue });
                            if (finalValue)
                                sublist.setSublistValue({ id: 'custpage_tk_final_value', line: index, value: finalValue });

                            index++
                        });

                        let customSearchPurchaseOrder = search.create({
                            type: 'customrecord_tk_p0_comission',
                            filters: [
                                ['custrecord_tk_lin_po_ges_comission_ls', 'is', idRec]
                            ],
                            columns: [
                                'custrecord_tk_po_ls',
                                'custrecord_tk_doc_fiscal_comission_ls',
                            ]
                        });

                        let searchResultPurchaseOrder = customSearchPurchaseOrder.run().getRange({ start: 0, end: 1000 });

                        var index = 0;
                        searchResultPurchaseOrder.forEach(result => {

                            let fiscalDoc = result.getValue('custrecord_tk_doc_fiscal_comission_ls');
                            let purchaseOrderId = result.getValue('custrecord_tk_po_ls');

                            // if (fiscalDoc)
                            //     sublist.setSublistValue({ id: 'custpage_tk_doc_id', line: index, value: fiscalDoc });
                            if (purchaseOrderId)
                                sublist.setSublistValue({ id: 'custpage_tk_po_id_rec', line: index, value: purchaseOrderId });

                            index++
                        });
                    }

                    createSublist('custpage_tk_commission_adjustment', 'Consulta e Ajuste de Comissão', 'custpage_commission_tab', [
                        { id: 'custpage_tk_sales_rep', type: serverWidget.FieldType.SELECT, label: 'Representante de Vendas', source: 'employee' },
                        { id: 'custpage_tk_assigned_rep', type: serverWidget.FieldType.SELECT, label: 'Correção de Representante', source: 'employee' },
                        { id: 'custpage_tk_sales_date', type: serverWidget.FieldType.DATE, label: 'Data' },
                        { id: 'custpage_tk_sales_transa', type: serverWidget.FieldType.SELECT, label: 'Transação de origem', source: 'transaction' },
                        { id: 'custpage_tk_fiscal_doc', type: serverWidget.FieldType.TEXT, label: 'Transação', source: 'transaction' },
                        { id: 'custpage_tk_sales_value', type: serverWidget.FieldType.CURRENCY, label: 'Valor da transação' },
                        { id: 'custpage_tk_sales_aliq', type: serverWidget.FieldType.TEXT, label: 'Alíquota de comissão' },
                        { id: 'custpage_tk_total_value', type: serverWidget.FieldType.CURRENCY, label: 'Valor da Comissão' }
                    ]);

                    createSublist('custpage_tk_value_edit', 'Edição de Valores', 'custpage_edit_values_tab', [
                        // { id: 'custpage_tk_fiscal_doc_edit', type: serverWidget.FieldType.SELECT, label: 'Documento Fiscal', source: 'transaction' },
                        { id: 'custpage_tk_sales_rep_edit', type: serverWidget.FieldType.SELECT, label: 'Representante de Vendas', source: 'employee' },
                        { id: 'custpage_tk_desc', type: serverWidget.FieldType.TEXT, label: 'Descrição' },
                        { id: 'custpage_tk_credit', type: serverWidget.FieldType.CURRENCY, label: 'Crédito' },
                        { id: 'custpage_tk_debit', type: serverWidget.FieldType.CURRENCY, label: 'Débito' },
                        // { id: 'custpage_tk_commission_value', type: serverWidget.FieldType.CURRENCY, label: 'Valor da Comissão' },
                        { id: 'custpage_tk_final_value', type: serverWidget.FieldType.CURRENCY, label: 'Valor Final' }
                    ]);

                    // createSublist('custpage_tk_value_edit_', 'Pedido de compras', 'custpage_tk_po_ge', [
                    //     { id: 'custpage_tk_doc_id', type: serverWidget.FieldType.SELECT, label: 'Documento Fiscal', source: 'transaction' },
                    //     { id: 'custpage_tk_po_id_rec', type: serverWidget.FieldType.SELECT, label: 'Pedido de compra', source: 'transaction' },
                    //     { id: 'custpage_tk_po_amount', type: serverWidget.FieldType.CURRENCY, label: 'Valor total' },
                    // ]);
                }
            } else if (recordType == 'invoice') {
                if (scriptContext.type == scriptContext.UserEventType.COPY) {
                    scriptContext.newRecord.setValue('custbody_tk_gerad_comission', false)
                }
            }
        };

        const addCommissionSublist = (form, scriptContext) => {
            const sublist = form.addSublist({
                id: 'custpage_commission_sublist',
                label: 'Consulta e Ajuste de Comissão',
                type: serverWidget.SublistType.INLINEEDITOR
            });

            const fieldSalesRep = sublist.addField({
                id: 'custpage_sales_rep',
                type: serverWidget.FieldType.SELECT,
                label: 'Representante de vendas',
                source: 'employee'
            });
            fieldSalesRep.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            sublist.addField({
                id: 'custpage_designated_rep',
                type: serverWidget.FieldType.SELECT,
                label: 'Correção de Representante',
                source: 'employee'
            });

            sublist.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.SELECT,
                label: 'Cliente',
                source: 'customer'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            const fieldInvoice = sublist.addField({
                id: 'custpage_invoice',
                type: serverWidget.FieldType.SELECT,
                label: 'Documento Fiscal',
                source: 'transaction'
            });
            fieldInvoice.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            const fieldCommission = sublist.addField({
                id: 'custpage_commission_rate',
                type: serverWidget.FieldType.PERCENT,
                label: 'Alíquota de comissão'
            });
            fieldCommission.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            sublist.addField({
                id: 'custpage_nfse_value',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Valor da transação'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            const fieldTotal = sublist.addField({
                id: 'custpage_total_value',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Valor comissão'
            }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            const sublist2 = form.addSublist({
                id: 'custpage_edit_values_sublist',
                label: 'Edição de Valores',
                type: serverWidget.SublistType.INLINEEDITOR
            });

            sublist2.addField({
                id: 'custpage_sales_rep_teste',
                type: serverWidget.FieldType.SELECT,
                label: 'Representante de vendas',
                source: 'employee'
            });

            sublist2.addField({
                id: 'custpage_description',
                type: serverWidget.FieldType.TEXT,
                label: 'Descrição'
            });

            sublist2.addField({
                id: 'custpage_credit',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Crédito'
            });

            sublist2.addField({
                id: 'custpage_debit',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Débito'
            });

            sublist2.addField({
                id: 'custpage_final_value',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Valor Final'
            });

            var searchTrans = scriptContext.request.parameters.search
            const startDate = scriptContext.request.parameters.custrecord_start_date;
            const endDate = scriptContext.request.parameters.custrecord_end_date;
            const mesValue = scriptContext.request.parameters.mesValue;
            log.audit("mesValue", mesValue)
            const employeeIdParam = scriptContext.request.parameters.custrecord_employee;
            employeeIds = employeeIdParam

            var startDateFormat = scriptContext.request.parameters.custrecord_start_date;
            if (startDateFormat) {
                var parts = startDateFormat.split('/');
                var dateObj = new Date(parts[2], parts[1] - 1, parts[0])
                scriptContext.newRecord.setValue({ fieldId: 'custrecord_tk_dt_start_dt', value: new Date(dateObj) });

            }

            var startEndFormat = scriptContext.request.parameters.custrecord_end_date;
            if (startEndFormat) {
                var partsEnd = startEndFormat.split('/');
                var dateObjEnd = new Date(partsEnd[2], partsEnd[1] - 1, partsEnd[0])

                scriptContext.newRecord.setValue({ fieldId: 'custrecord_tk_dt_end_dt', value: new Date(dateObjEnd) });
            }

            scriptContext.newRecord.setValue({ fieldId: 'custrecord_tk_sales_rep_ls', value: employeeIds });
            scriptContext.newRecord.setValue({ fieldId: 'custrecord_tk_perid_conta', value: mesValue });

            if (searchTrans) {

                var filters = [
                    ["mainline", "is", "T"],
                    "AND",
                    ["custbody_tk_commission_amount", "greaterthan", "0.00"],
                    "AND",
                    ["custbody_tk_method_calculating_com_ls", "noneof", "@NONE@"],
                    "AND",
                    ["type", "anyof", "RtnAuth", "CuTrSale123", "CustInvc", "CuTrSale121"],
                    "AND",
                    ["custbody_tk_gerad_comission", "is", false],
                ];

                if (startDate)
                    filters.push("AND", ["trandate", "onorafter", startDate]);
                if (endDate)
                    filters.push("AND", ["trandate", "onorbefore", endDate]);

                filters.push("AND", ["salesrep", "anyof", employeeIds]);
                filters.push("AND", ["postingperiod", "anyof", mesValue]);


                log.audit('filters', filters);
                var ids = [];
                var index = 0;
                var index2 = 0

                var invoiceSearch = search.create({
                    type: "transaction",
                    filters: filters,
                    columns: [
                        { name: "type", label: "Tipo" },
                        { name: "salesrep", label: "Representante de vendas" },
                        { name: "custbody_tk_commission_amount", label: "Valor da Comissão" },
                        { name: "amount", label: "Valor" },
                        { name: "entity" },
                    ]
                });

                invoiceSearch.run().each(function (result) {
                    var salesRep = result.getValue("salesrep");
                    var entity = result.getValue("entity");

                    if (ids.indexOf(salesRep) == -1) {

                        sublist2.setSublistValue({
                            id: 'custpage_sales_rep_teste',
                            line: index2,
                            value: salesRep
                        });

                        index2++
                        ids.push(salesRep);
                    };

                    var invoiceId = result.id;
                    var type = result.getValue("type");
                    var totalValue = result.getValue("amount");
                    var commissionAmount = result.getValue("custbody_tk_commission_amount") || "0.00";

                    if (type != 'CustInvc')
                        commissionAmount = commissionAmount * -1;

                    sublist.setSublistValue({
                        id: 'custpage_invoice',
                        line: index,
                        value: invoiceId
                    });

                    var porc = getCommissionPercentage(salesRep)
                    log.audit('porc', porc)
                    sublist.setSublistValue({
                        id: 'custpage_commission_rate',
                        line: index,
                        value: porc
                    });

                    sublist.setSublistValue({
                        id: 'custpage_sales_rep',
                        line: index,
                        value: salesRep
                    });

                    sublist.setSublistValue({
                        id: 'custpage_total_value',
                        line: index,
                        value: (totalValue * porc) / 100
                    });

                    sublist.setSublistValue({
                        id: 'custpage_nfse_value',
                        line: index,
                        value: totalValue
                    });

                    sublist.setSublistValue({
                        id: 'custpage_customer',
                        line: index,
                        value: entity
                    });

                    index++
                    return true;
                });

                function addInvoiceToSublist(result, sublistId) {
                    var salesRep = result.getValue("salesrep");
                    if (ids.indexOf(salesRep) == -1) {

                        // scriptContext.newRecord.selectNewLine({ sublistId: sublistId });

                        // setSublistValue(sublistId, "custrecord_tk_rep_vendas", salesRep);

                        // scriptContext.newRecord.commitLine({ sublistId: sublistId });

                        ids.push(salesRep);
                    }
                }

                function addInvoiceToAdjustmentSublist(result, sublistId, index) {
                    var invoiceId = result.id;
                    var type = result.getValue("type");
                    var salesRep = result.getValue("salesrep");
                    var totalValue = result.getValue("amount");
                    var commissionAmount = result.getValue("custbody_tk_commission_amount") || "0.00";

                    if (type != 'CustInvc')
                        commissionAmount = commissionAmount * -1;

                    // sublist.setSublistValue({
                    //     id: 'custpage_invoice',
                    //     line: index,
                    //     value: invoiceId
                    // });

                    // scriptContext.newRecord.selectNewLine({ sublistId: sublistId });

                    // setSublistValue(sublistId, "custrecord_tk_doc_invoice_sl", invoiceId);
                    // setSublistValue(sublistId, "custrecord_tk_aliq_comiss", getCommissionPercentage(salesRep));
                    // setSublistValue(sublistId, "custrecord_tk_sales_representative_sl", salesRep);
                    // setSublistValue(sublistId, "custrecord_tk_value_amount", commissionAmount);

                    // scriptContext.newRecord.commitLine({ sublistId: sublistId });
                }

                /**
                * Retorna o percentual de comissão do representante informado
                * @param {string|number} salesRepId - ID interno do representante de vendas
                * @returns {string|null} - Valor do percentual de comissão ou null se não encontrar
                */
                function getCommissionPercentage(salesRepId) {
                    var searchResult = search.create({
                        type: "customrecord_tk_commission_rules",
                        filters: [
                            ["custrecord_tk_salesrep_ls", "anyof", salesRepId]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_tk_commission_percentage_pc" })
                        ]
                    }).run().getRange({ start: 0, end: 1 });

                    if (searchResult.length > 0) {
                        return parseFloat(searchResult[0].getValue({ name: "custrecord_tk_commission_percentage_pc" }).replace('%', ''));
                    }

                    return null;
                }


                // function setSublistValue(sublistId, fieldId, value) {
                //     scriptContext.newRecord.setCurrentSublistValue({
                //         sublistId: sublistId,
                //         fieldId: fieldId,
                //         value: value
                //     });
                // }
            } else {
            }

            // Busca registros relacionados (ajuste o campo abaixo conforme necessário)
            // const resultSet = search.create({
            //     type: 'customrecord_tk_commission_management_ad',
            //     filters: [['custrecord_tk_commission_query_adjustmen', 'is', recordId]],
            //     columns: [
            //         'custrecord_tk_sales_representative_sl',
            //         'custrecord_tk_designated_representative',
            //         'custrecord_tk_doc_invoice_sl',
            //         'custrecord_tk_aliq_comiss',
            //         'custrecord_tk_value_amount',
            //         'custrecord_vit_nfse_total'
            //     ]
            // }).run().getRange({ start: 0, end: 100 });

            // resultSet.forEach((result, i) => {
            //     sublist.setSublistValue({
            //         id: 'custpage_sales_rep',
            //         line: i,
            //         value: result.getText({ name: 'custrecord_tk_sales_representative_sl' }) || ''
            //     });

            //     sublist.setSublistValue({
            //         id: 'custpage_designated_rep',
            //         line: i,
            //         value: result.getText({ name: 'custrecord_tk_designated_representative' }) || ''
            //     });

            //     sublist.setSublistValue({
            //         id: 'custpage_invoice',
            //         line: i,
            //         value: result.getText({ name: 'custrecord_tk_doc_invoice_sl' }) || ''
            //     });

            //     sublist.setSublistValue({
            //         id: 'custpage_commission_rate',
            //         line: i,
            //         value: result.getValue({ name: 'custrecord_tk_aliq_comiss' }) || '0'
            //     });

            //     sublist.setSublistValue({
            //         id: 'custpage_total_value',
            //         line: i,
            //         value: result.getValue({ name: 'custrecord_tk_value_amount' }) || '0'
            //     });

            //     sublist.setSublistValue({
            //         id: 'custpage_nfse_value',
            //         line: i,
            //         value: result.getValue({ name: 'custrecord_vit_nfse_total' }) || '0'
            //     });
            // });
        };

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {
                const recordType = scriptContext.newRecord.type;
                const idRec = scriptContext.newRecord.id;

                if (recordType == 'invoice' || recordType == 'customsale_brl_goods_return' || recordType == 'customsale_brl_edoc_cancel' || recordType == 'returnauthorization') {
                    msr.calculateCommissionByTransaction(scriptContext);
                } else if (recordType == 'customrecord_tk_commission_adjustment_ma') {
                    if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {
                        let customSearchEditing = search.create({
                            type: 'customrecord_tk_value_editing',
                            filters: [
                                ['custrecord_tk_commission_query_edit_link', 'is', idRec]
                            ],
                            columns: [
                                'custrecord_tk_invoice_edit_ls',
                                'custrecord_tk_credit_cr',
                                'custrecord_tk_debit_cr',
                                'custrecord_tk_commission_value',
                                'custrecord_tk_final_value'
                            ]
                        });

                        let searchResultEditing = customSearchEditing.run().getRange({ start: 0, end: 1000 });

                        searchResultEditing.forEach(result => {
                            let fiscalDoc = result.getValue('custrecord_tk_invoice_edit_ls');
                            let finalValue = result.getValue('custrecord_tk_final_value');

                            if (finalValue) {
                                record.submitFields({
                                    type: 'invoice',
                                    id: fiscalDoc,
                                    values: {
                                        custbody_tk_commission_amount: finalValue
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                        });

                        let customSearch = search.create({
                            type: 'customrecord_tk_commission_management_ad',
                            filters: [
                                ['custrecord_tk_commission_query_adjustmen', 'is', idRec]
                            ],
                            columns: [
                                'custrecord_tk_designated_representative',
                                'custrecord_tk_value_amount',
                                'custrecord_tk_sales_representative_sl',
                                'custrecord_tk_doc_invoice_sl'
                            ]
                        });

                        let searchResult = customSearch.run().getRange({ start: 0, end: 1000 });

                        let commissionTotals = {};

                        if (searchResult && searchResult.length > 0) {
                            searchResult.forEach(result => {
                                let assignedRep = result.getValue('custrecord_tk_designated_representative');
                                let totalValue = parseFloat(result.getValue('custrecord_tk_value_amount')) || 0;
                                let salesRep = result.getValue('custrecord_tk_sales_representative_sl');
                                let fiscalDoc = result.getValue('custrecord_tk_doc_invoice_sl');

                                log.audit('totalValue', totalValue);

                                let repKey = assignedRep || salesRep;

                                if (assignedRep && fiscalDoc) {
                                    record.submitFields({
                                        type: 'invoice',
                                        id: fiscalDoc,
                                        values: {
                                            salesrep: assignedRep,
                                            custbody_tk_commission_amount: totalValue
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                }

                                if (repKey) {
                                    if (!commissionTotals[repKey]) {
                                        commissionTotals[repKey] = {
                                            total: 0,
                                            fiscalDocs: []
                                        };
                                    }
                                    commissionTotals[repKey].total += totalValue;

                                    if (fiscalDoc && !commissionTotals[repKey].fiscalDocs.includes(fiscalDoc)) {
                                        commissionTotals[repKey].fiscalDocs.push(fiscalDoc);
                                    }
                                }
                            });
                        }

                        for (const key in commissionTotals) {
                            // if (commissionTotals.hasOwnProperty(key)) {
                            //     // log.audit(`ID: ${key}`);
                            //     // log.audit(`Total: ${commissionTotals[key].total}`);
                            //     // log.audit(`Fiscal Docs: ${commissionTotals[key].fiscalDocs.join(", ")}`);
                            //     // log.audit('----------------------');

                            //     log.audit(commissionTotals[key].fiscalDocs.join(", "));

                            //     let purchaseOrder = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
                            //     purchaseOrder.setValue({ fieldId: 'entity', value: 1240 });

                            //     purchaseOrder.selectNewLine({ sublistId: 'item' });
                            //     purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 2613 });
                            //     purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                            //     purchaseOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: commissionTotals[key].total });
                            //     purchaseOrder.commitLine({ sublistId: 'item' });

                            //     var poId = purchaseOrder.save();

                            //     // log.audit('Pedido de Compra Criado', `ID: ${poId}`);

                            //     if (poId) {
                            //         let recordPoComission = record.create({ type: 'customrecord_tk_p0_comission', isDynamic: true });

                            //         recordPoComission.setValue({ fieldId: 'custrecord_tk_po_ls', value: poId });
                            //         recordPoComission.setValue({ fieldId: 'custrecord_tk_lin_po_ges_comission_ls', value: idRec });
                            //         purchaseOrder.setValue({ fieldId: 'custrecord_tk_doc_fiscal_comission_ls', value: [1463] });

                            //         var recordId = recordPoComission.save();

                            //         log.audit('recordId', recordId);
                            //     }
                            // }
                        }

                    } else if (scriptContext.type == scriptContext.UserEventType.EDIT) {

                    }
                } else if (recordType == 'customrecord_tk_commission_adjustment_ma') {

                }
            } catch (e) {
                log.error('error in function afterSubmit', e)
            };
        };

        return { beforeLoad, afterSubmit }
    });
